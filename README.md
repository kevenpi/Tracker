# Cal-KIDS QR Code Tracking Platform

Track QR code scans across Cal-KIDS outreach campaigns (flyers, events, locations). Each campaign gets a unique short URL -- QR codes point to that URL, a serverless function logs the scan, then redirects to the real destination.

## Stack

- Next.js (App Router)
- Vercel Postgres
- Tailwind CSS
- `qrcode` npm package for QR generation

## Setup

### 1. Create a Vercel Postgres Database

Go to [Vercel Storage](https://vercel.com/docs/storage/vercel-postgres/quickstart) and create a new Postgres database. Connect it to your project -- Vercel will auto-inject the required environment variables.

### 2. Create Tables

Run this SQL in your database (via the Vercel dashboard SQL editor or any Postgres client):

```sql
CREATE TABLE campaigns (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  destination_url TEXT NOT NULL,
  status TEXT DEFAULT 'active',
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE scans (
  id SERIAL PRIMARY KEY,
  campaign_id TEXT REFERENCES campaigns(id),
  scanned_at TIMESTAMP DEFAULT NOW(),
  user_agent TEXT,
  referrer TEXT
);
```

### 3. Environment Variables

If running locally, create a `.env.local` file with your Postgres connection string. Vercel injects these automatically when a Postgres database is connected:

```
POSTGRES_URL=your_connection_string
```

### 4. Install and Run

```bash
npm install
npm run dev
```

### 5. Deploy

```bash
npx vercel deploy
```

Or connect the repo to Vercel for automatic deployments on push.

## How It Works

1. Create a campaign in the dashboard (`/dashboard`) with a name and destination URL
2. Each campaign gets a unique tracking URL: `https://your-domain.vercel.app/api/r/{campaignId}`
3. Generate and download a QR code for that URL
4. When someone scans the QR code, the app logs the scan (timestamp, user agent, referrer) and redirects them to the destination
5. View scan counts and manage campaigns from the dashboard

## API Routes

| Method | Route | Description |
|--------|-------|-------------|
| GET | `/api/r/[campaignId]` | Log scan and redirect (302) |
| GET | `/api/campaigns` | List all campaigns with scan counts |
| POST | `/api/campaigns` | Create a new campaign |
| PATCH | `/api/campaigns/[id]` | Update campaign status/name/url |
| DELETE | `/api/campaigns/[id]` | Delete campaign and its scans |
| GET | `/api/campaigns/[id]/qr` | Generate QR code PNG |
