// ---------------------------------------------------------------------------
// Geolocation resolver.
//
// IMPORTANT: IP-based geolocation is CITY-LEVEL APPROXIMATE — it is derived
// from the visitor's network/ISP, not GPS. Country is usually accurate; city
// and region are best-effort and can be wrong or empty.
//
// Source priority:
//   1. Vercel's built-in geo request headers (free, present in production).
//   2. A free IP-geo HTTP API fallback (for local dev, where the Vercel
//      headers are absent). Swap providers via GEO_FALLBACK_PROVIDER.
//
// This module NEVER throws — on any error it returns nulls so the caller can
// still complete the redirect.
// ---------------------------------------------------------------------------

export type GeoData = {
  ip: string | null;
  country: string | null;
  region: string | null;
  city: string | null;
  lat: number | null;
  lng: number | null;
};

const EMPTY = (ip: string | null): GeoData => ({
  ip,
  country: null,
  region: null,
  city: null,
  lat: null,
  lng: null,
});

function getClientIp(h: Headers): string | null {
  const xff = h.get("x-forwarded-for");
  if (xff) return xff.split(",")[0].trim();
  return h.get("x-real-ip");
}

function isPrivateIp(ip: string | null): boolean {
  if (!ip) return true;
  return (
    ip === "::1" ||
    ip.startsWith("127.") ||
    ip.startsWith("10.") ||
    ip.startsWith("192.168.") ||
    /^172\.(1[6-9]|2\d|3[01])\./.test(ip) ||
    ip.startsWith("::ffff:127.")
  );
}

/** Read Vercel's geo headers, if present. Returns null when absent. */
function fromVercelHeaders(h: Headers, ip: string | null): GeoData | null {
  const country = h.get("x-vercel-ip-country");
  const city = h.get("x-vercel-ip-city");
  const region = h.get("x-vercel-ip-country-region");
  if (!country && !city && !region) return null;

  const lat = h.get("x-vercel-ip-latitude");
  const lng = h.get("x-vercel-ip-longitude");
  return {
    ip,
    country: country || null,
    region: region || null,
    // Vercel URL-encodes the city header (e.g. "San%20Francisco").
    city: city ? safeDecode(city) : null,
    lat: lat ? parseFloat(lat) : null,
    lng: lng ? parseFloat(lng) : null,
  };
}

function safeDecode(v: string): string {
  try {
    return decodeURIComponent(v);
  } catch {
    return v;
  }
}

/** Free IP-geo API fallback for local dev. Has a hard timeout; never throws. */
async function fromFallbackApi(ip: string | null): Promise<GeoData> {
  const provider = process.env.GEO_FALLBACK_PROVIDER ?? "ipapi";
  if (provider === "none") return EMPTY(ip);
  // A private/loopback IP would just resolve to the dev machine's egress, or
  // error — skip it. Query the API's "my IP" endpoint instead.
  const queryIp = isPrivateIp(ip) ? "" : ip;

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 1500);
    let data: GeoData;

    if (provider === "ip-api") {
      const res = await fetch(`http://ip-api.com/json/${queryIp ?? ""}`, {
        signal: controller.signal,
        cache: "no-store",
      });
      const d = await res.json();
      data = {
        ip,
        country: d.countryCode ?? null,
        region: d.regionName ?? null,
        city: d.city ?? null,
        lat: typeof d.lat === "number" ? d.lat : null,
        lng: typeof d.lon === "number" ? d.lon : null,
      };
    } else {
      // default: ipapi.co
      const url = queryIp
        ? `https://ipapi.co/${queryIp}/json/`
        : `https://ipapi.co/json/`;
      const res = await fetch(url, {
        signal: controller.signal,
        cache: "no-store",
      });
      const d = await res.json();
      data = {
        ip,
        country: d.country ?? d.country_code ?? null,
        region: d.region ?? null,
        city: d.city ?? null,
        lat: typeof d.latitude === "number" ? d.latitude : null,
        lng: typeof d.longitude === "number" ? d.longitude : null,
      };
    }

    clearTimeout(timer);
    return data;
  } catch {
    return EMPTY(ip);
  }
}

/**
 * Resolve geolocation for an incoming request's headers.
 * Always resolves (never rejects).
 */
export async function resolveGeo(h: Headers): Promise<GeoData> {
  const ip = getClientIp(h);
  const fromHeaders = fromVercelHeaders(h, ip);
  if (fromHeaders) return fromHeaders;
  return fromFallbackApi(ip);
}
