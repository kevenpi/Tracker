import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveGeo, reconcileGeo } from "@/lib/geo";
import { parseUA } from "@/lib/ua";

// This route must run on the Node.js runtime (Prisma) and never be cached.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Scan endpoint: GET /r/:slug
 *   1. Look up the QR code by slug.
 *   2. Log the scan (geo + UA + referrer) — fully guarded, see below.
 *   3. 302 redirect the visitor to the real destination.
 *
 * RESILIENCE: logging and geo lookup are wrapped so that ANY failure (DB down,
 * geo API timeout, etc.) is logged and swallowed — the visitor is ALWAYS
 * redirected. The only thing that stops a redirect is the code not existing,
 * being disabled, or being expired.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { slug: string } }
) {
  const { slug } = params;
  const url = new URL(req.url);
  // Set once the client-side bounce has run (carrying the browser time zone).
  const bounced = url.searchParams.get("_t") === "1";

  let qr;
  try {
    qr = await prisma.qrCode.findUnique({ where: { slug } });
  } catch (err) {
    console.error(`[/r/${slug}] lookup failed`, err);
    return statusPage(404, "QR code not found");
  }

  if (!qr) return statusPage(404, "QR code not found");
  if (!qr.isActive) return statusPage(410, "This QR code has been disabled");
  if (qr.expiresAt && qr.expiresAt.getTime() < Date.now()) {
    return statusPage(410, "This QR code has expired");
  }

  // First hit: serve a tiny interstitial that reads the browser time zone (no
  // permission prompt) and immediately bounces back here with ?_t=1&tz=… . A
  // <noscript> meta-refresh guarantees the redirect still happens without JS.
  if (!bounced) {
    return interstitial(slug);
  }

  // Bounced hit: log the scan, then redirect. Logging is awaited (so it
  // survives serverless teardown) but guarded so it can never block the
  // redirect.
  const tz = url.searchParams.get("tz");
  try {
    await logScan(req, qr.id, tz);
  } catch (err) {
    console.error(`[/r/${slug}] scan logging failed (redirect proceeds)`, err);
  }

  return NextResponse.redirect(qr.destinationUrl, 302);
}

async function logScan(
  req: NextRequest,
  qrCodeId: string,
  timezone: string | null
): Promise<void> {
  const userAgent = req.headers.get("user-agent");
  const referrer = req.headers.get("referer");
  const rawGeo = await resolveGeo(req.headers);
  const geo = reconcileGeo(rawGeo, timezone);
  const { deviceType, os, browser } = parseUA(userAgent);

  await prisma.scan.create({
    data: {
      qrCodeId,
      ipAddress: geo.ip,
      country: geo.country,
      region: geo.region,
      city: geo.city,
      lat: geo.lat,
      lng: geo.lng,
      timezone: timezone || null,
      userAgent,
      deviceType,
      os,
      browser,
      referrer,
    },
  });
}

/**
 * The capture/redirect interstitial. Renders in <50ms and replaces itself.
 * Reads the IANA time zone with no prompt, then continues to ?_t=1&tz=… .
 */
function interstitial(slug: string): NextResponse {
  const base = `/r/${encodeURIComponent(slug)}?_t=1`;
  const html = `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Redirecting…</title><noscript><meta http-equiv="refresh" content="0;url=${base}"></noscript><style>html,body{height:100%}body{margin:0;display:flex;align-items:center;justify-content:center;background:#0b0b0f;color:#71717a;font-family:system-ui,sans-serif;font-size:14px}</style></head><body><p>Redirecting…</p><script>(function(){var tz="";try{tz=Intl.DateTimeFormat().resolvedOptions().timeZone||"";}catch(e){}var u=${JSON.stringify(
    base
  )}+(tz?("&tz="+encodeURIComponent(tz)):"");location.replace(u);})();</script></body></html>`;
  return new NextResponse(html, {
    status: 200,
    headers: {
      "content-type": "text/html; charset=utf-8",
      // Never cache the interstitial — it must run fresh on every scan.
      "cache-control": "no-store, max-age=0",
    },
  });
}

function statusPage(status: number, message: string): NextResponse {
  const html = `<!doctype html><html><head><meta charset="utf-8"><title>${message}</title><meta name="viewport" content="width=device-width, initial-scale=1"><style>body{font-family:system-ui,sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;background:#f8fafc;color:#0f172a}div{text-align:center}</style></head><body><div><h1>${status}</h1><p>${message}</p></div></body></html>`;
  return new NextResponse(html, {
    status,
    headers: { "content-type": "text/html; charset=utf-8" },
  });
}
