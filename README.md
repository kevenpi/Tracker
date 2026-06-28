# QR Tracker

Create trackable QR codes and see who scans them — counts, timing, location, and
device breakdowns. Tracking works through **redirect links**: each QR encodes a
short URL on *your* server (`/r/<slug>`). When someone scans it, the server logs
the scan and then 302-redirects them to the real destination. Because the QR
points at your slug (not the destination directly), you can change where it
points later without reprinting the code.

> **No authentication.** This is an internal tool — anyone with the URL can
> create and view QR codes. Share the link only with people you trust.

## Features

- **Drive-style folders.** Organize trackers into folders you can create,
  rename, delete, and move trackers between. The home page is a Drive: folders
  on top, loose trackers below; open a folder to see its contents.
- **CSV bulk import.** Upload a CSV (`name`, `destination_url`, optional
  `folder` + `expires_at`) to create many trackers at once — a `folder` value
  auto-creates that folder.
- **Create** QR codes from a destination URL + label (+ optional expiry and
  folder), with PNG and SVG download.
- **Per-QR analytics**: total & unique scans, scans-over-time chart, a
  **world scan map**, geographic table, device/OS/browser charts, and a
  paginated raw scan log.
- **Edit** the destination at any time (the QR image stays the same) and
  **disable/delete** a code.

## Tech stack

Next.js 14 (App Router) · TypeScript · PostgreSQL via Prisma · Tailwind CSS ·
Recharts · `qrcode` · `ua-parser-js`.

## Data model

- **Group** (folder): `id, name, createdAt`
- **QrCode**: `id, slug (unique), name, destinationUrl, isActive, expiresAt, groupId (→ Group), createdAt, updatedAt`
- **Scan**: `id, qrCodeId, scannedAt, ipAddress, country, region, city, lat, lng, userAgent, deviceType, os, browser, referrer`

A baseline migration is committed at `prisma/migrations/0_init`, so
`prisma migrate deploy` creates all tables on first deploy with no extra steps.

---

## Local setup

You need **Node.js 18+** and a **PostgreSQL** database. The easiest free Postgres
is [Neon](https://neon.tech) or [Supabase](https://supabase.com) — create a
project and copy its connection string. (Do **not** use SQLite: Vercel's
serverless filesystem is ephemeral and won't persist it.)

```bash
# 1. Install dependencies
npm install

# 2. Configure environment
cp .env.example .env
#    then edit .env and set DATABASE_URL to your Neon/Supabase connection string

# 3. Create the database tables
npm run db:migrate        # prisma migrate dev (creates the initial migration)

# 4. (optional) Seed sample QR codes + fake scans so the dashboard isn't empty
npm run db:seed

# 5. Run it
npm run dev               # http://localhost:3000
```

### Environment variables

| Variable                 | Required | Purpose                                                        |
| ------------------------ | -------- | -------------------------------------------------------------- |
| `DATABASE_URL`           | yes      | PostgreSQL connection string.                                  |
| `NEXT_PUBLIC_BASE_URL`   | yes      | Base URL encoded into QR codes (`http://localhost:3000` local).|
| `GEO_FALLBACK_PROVIDER`  | no       | Dev-only IP-geo fallback: `ipapi` (default), `ip-api`, `none`. |
| `UNIQUE_SCAN_WINDOW_MINUTES` | no   | Window for de-duping unique scans by IP (default `30`).        |

### Geolocation

- **In production on Vercel**, location comes from Vercel's built-in geo request
  headers (`x-vercel-ip-country`, `x-vercel-ip-city`, …) — free, no API key.
- **In local dev**, those headers are absent, so it falls back to a free IP-geo
  API (`ipapi.co` by default). Swap providers via `GEO_FALLBACK_PROVIDER`.
- **IP-based location is city-level approximate**, derived from the network, not
  GPS. Country is usually accurate; city/region are best-effort. The geo lookup
  has a hard timeout and can never block or break a redirect.

---

## Deploy to Vercel + GitHub

1. **Push to GitHub**

   ```bash
   git init && git add . && git commit -m "QR Tracker"
   git branch -M main
   git remote add origin git@github.com:<you>/qr-tracker.git
   git push -u origin main
   ```

2. **Create a Postgres database** — in [Neon](https://neon.tech) (or via the
   Vercel dashboard → Storage → Postgres). Copy the connection string.

3. **Import the repo into Vercel** — [vercel.com/new](https://vercel.com/new) →
   pick the repo. Framework auto-detects as Next.js.

4. **Add environment variables** in Vercel (Project → Settings → Environment
   Variables) for Production (and Preview):

   - `DATABASE_URL` → your Neon connection string
   - `NEXT_PUBLIC_BASE_URL` → `https://<your-app>.vercel.app`

5. **Deploy.** The build command (see `vercel.json`) runs
   `prisma generate && prisma migrate deploy && next build`, so your migrations
   are applied automatically on every deploy. Prisma Client is also generated in
   `postinstall`, so it's always in sync.

   To run migrations manually instead:

   ```bash
   DATABASE_URL="<prod url>" npx prisma migrate deploy
   ```

6. *(optional)* **Seed production**:

   ```bash
   DATABASE_URL="<prod url>" npm run db:seed
   ```

### The `/r/:slug` route

No `vercel.json` rewrite is needed: `/r/<slug>` is a native Next.js **route
handler** (`src/app/r/[slug]/route.ts`) that runs on the Node.js runtime, logs
the scan, and issues the 302. `vercel.json` only customizes the build command to
run migrations.

---

## How the scan loop works (resilience)

`GET /r/:slug`:

1. Look up the code by slug. If missing → 404; if disabled or expired → 410.
2. Resolve geo (Vercel headers → fallback API, with timeout) and parse the
   User-Agent, then write a `Scan` row.
3. 302-redirect to the destination.

Step 2 is wrapped in try/catch: **if geo lookup or DB logging fails, the error is
logged and the visitor is still redirected.** A scan is never allowed to break
the user's experience.

## Project layout

```
prisma/
  schema.prisma          # QrCode + Scan models
  seed.ts                # sample data
src/
  lib/
    prisma.ts            # singleton Prisma client
    slug.ts              # short slug generator
    url.ts               # URL validate/normalize + expiry parsing
    geo.ts               # Vercel headers → IP-geo fallback (never throws)
    ua.ts                # User-Agent parsing
    qr.ts                # QR PNG/SVG generation + short-URL builder
    analytics.ts         # aggregation helpers (unique, buckets, breakdowns)
  app/
    page.tsx             # dashboard
    create/page.tsx      # create form
    qr/[id]/page.tsx     # per-QR analytics
    r/[slug]/route.ts    # scan + redirect endpoint
    api/qrcodes/route.ts            # create / list
    api/qrcodes/[id]/route.ts       # edit / delete
  components/
    QrDownload.tsx       # QR image + PNG/SVG download
    QrSettings.tsx       # edit destination, disable, delete
    charts.tsx           # Recharts line + pie
```
