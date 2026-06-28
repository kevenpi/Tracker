import type { Scan } from "@prisma/client";

export type CountItem = { name: string; value: number };
export type TimeBucket = { label: string; count: number };

/**
 * Count "unique" scans by de-duplicating on IP address within a rolling window.
 * Two scans from the same IP within `windowMinutes` count once; a later scan
 * from that IP after the window counts again (treated as a new visit).
 */
export function countUniqueScans(scans: Scan[], windowMinutes: number): number {
  const windowMs = windowMinutes * 60_000;
  const byIp = new Map<string, number[]>();
  for (const s of scans) {
    const ip = s.ipAddress ?? "unknown";
    const arr = byIp.get(ip) ?? [];
    arr.push(s.scannedAt.getTime());
    byIp.set(ip, arr);
  }

  let unique = 0;
  for (const times of byIp.values()) {
    times.sort((a, b) => a - b);
    let lastCounted = -Infinity;
    for (const t of times) {
      if (t - lastCounted > windowMs) {
        unique++;
        lastCounted = t;
      }
    }
  }
  return unique;
}

/** Choose day vs hour bucketing based on the span of the data. */
export function pickGranularity(scans: Scan[]): "day" | "hour" {
  if (scans.length === 0) return "day";
  let min = Infinity;
  let max = -Infinity;
  for (const s of scans) {
    const t = s.scannedAt.getTime();
    if (t < min) min = t;
    if (t > max) max = t;
  }
  // Span under 48h → hourly is more informative.
  return max - min <= 48 * 3_600_000 ? "hour" : "day";
}

/** Bucket scans into a continuous time series (no gaps) for the line chart. */
export function bucketScans(
  scans: Scan[],
  granularity: "day" | "hour"
): TimeBucket[] {
  if (scans.length === 0) return [];

  const times = scans.map((s) => s.scannedAt.getTime()).sort((a, b) => a - b);
  const step = granularity === "hour" ? 3_600_000 : 86_400_000;

  const floor = (t: number) => {
    const d = new Date(t);
    if (granularity === "hour") d.setMinutes(0, 0, 0);
    else d.setHours(0, 0, 0, 0);
    return d.getTime();
  };

  const start = floor(times[0]);
  const end = floor(times[times.length - 1]);

  const counts = new Map<number, number>();
  for (const t of times) {
    const b = floor(t);
    counts.set(b, (counts.get(b) ?? 0) + 1);
  }

  const out: TimeBucket[] = [];
  const fmt = new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    ...(granularity === "hour" ? { hour: "numeric" } : {}),
  });
  for (let t = start; t <= end; t += step) {
    out.push({ label: fmt.format(new Date(t)), count: counts.get(t) ?? 0 });
  }
  return out;
}

/** Count occurrences of a field, returning sorted {name, value} pairs. */
export function breakdown(
  scans: Scan[],
  key: "deviceType" | "os" | "browser",
  { topN = 8 }: { topN?: number } = {}
): CountItem[] {
  const counts = new Map<string, number>();
  for (const s of scans) {
    const raw = s[key];
    const name = raw && raw.trim() ? raw : "Unknown";
    counts.set(name, (counts.get(name) ?? 0) + 1);
  }
  const sorted = [...counts.entries()]
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);

  if (sorted.length <= topN) return sorted;
  const head = sorted.slice(0, topN - 1);
  const rest = sorted.slice(topN - 1).reduce((sum, x) => sum + x.value, 0);
  return [...head, { name: "Other", value: rest }];
}

export type GeoRow = {
  country: string;
  region: string | null;
  city: string | null;
  count: number;
  lat: number | null;
  lng: number | null;
};

/**
 * Group scans by country / region / city for the geo table and map.
 * lat/lng are averaged across the scans in each group (approximate marker
 * position) — null when no coordinates were captured.
 */
export function geoBreakdown(scans: Scan[]): GeoRow[] {
  type Acc = GeoRow & { _latSum: number; _lngSum: number; _coordN: number };
  const counts = new Map<string, Acc>();
  for (const s of scans) {
    const country = s.country ?? "Unknown";
    const region = s.region ?? null;
    const city = s.city ?? null;
    const key = `${country}|${region ?? ""}|${city ?? ""}`;
    let acc = counts.get(key);
    if (!acc) {
      acc = {
        country, region, city, count: 0, lat: null, lng: null,
        _latSum: 0, _lngSum: 0, _coordN: 0,
      };
      counts.set(key, acc);
    }
    acc.count++;
    if (s.lat != null && s.lng != null) {
      acc._latSum += s.lat;
      acc._lngSum += s.lng;
      acc._coordN++;
    }
  }
  return [...counts.values()]
    .map(({ _latSum, _lngSum, _coordN, ...row }) => ({
      ...row,
      lat: _coordN > 0 ? _latSum / _coordN : null,
      lng: _coordN > 0 ? _lngSum / _coordN : null,
    }))
    .sort((a, b) => b.count - a.count);
}
