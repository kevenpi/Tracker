import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveGeo } from "@/lib/geo";
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

  // Log the scan. Awaited (so it survives serverless teardown) but guarded so
  // it can never block or break the redirect.
  try {
    await logScan(req, qr.id);
  } catch (err) {
    console.error(`[/r/${slug}] scan logging failed (redirect proceeds)`, err);
  }

  return NextResponse.redirect(qr.destinationUrl, 302);
}

async function logScan(req: NextRequest, qrCodeId: string): Promise<void> {
  const userAgent = req.headers.get("user-agent");
  const referrer = req.headers.get("referer");
  const geo = await resolveGeo(req.headers);
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
      userAgent,
      deviceType,
      os,
      browser,
      referrer,
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
