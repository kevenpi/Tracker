/**
 * Validate and normalize a user-supplied destination URL.
 *
 * - Trims whitespace.
 * - Adds an "https://" scheme if none was given (so "example.com" works).
 * - Rejects empty input, non-http(s) schemes, and hosts without a dot.
 *
 * Returns the normalized absolute URL string, or null if invalid.
 */
export function normalizeUrl(input: string | null | undefined): string | null {
  if (!input) return null;
  let value = input.trim();
  if (!value) return null;

  if (!/^[a-zA-Z][a-zA-Z0-9+.-]*:\/\//.test(value)) {
    value = "https://" + value;
  }

  try {
    const url = new URL(value);
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    // Require a dotted hostname (reject "https://localhostonly", bare words).
    if (!url.hostname.includes(".")) return null;
    return url.toString();
  } catch {
    return null;
  }
}

/**
 * Parse an optional expiry date string (e.g. "2026-07-01" from a date input).
 * Returns a Date at end-of-day, or null if absent/invalid.
 */
export function parseExpiry(input: string | null | undefined): Date | null {
  if (!input) return null;
  const trimmed = input.trim();
  if (!trimmed) return null;
  const d = new Date(trimmed);
  if (isNaN(d.getTime())) return null;
  // A plain date (no time) parses to midnight UTC; push to end of that day so
  // the code is usable for the whole expiry date.
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    d.setUTCHours(23, 59, 59, 999);
  }
  return d;
}
