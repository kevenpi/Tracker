import { randomBytes } from "crypto";

// Unambiguous base62 alphabet. Short, URL-safe, case-sensitive for entropy.
const ALPHABET =
  "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";

/**
 * Generate a random short slug (e.g. "aB3xK9").
 * 6 chars of base62 ≈ 56 billion combinations — collisions are extremely rare,
 * and the create path retries on the off chance one happens.
 */
export function generateSlug(length = 6): string {
  const bytes = randomBytes(length);
  let out = "";
  for (let i = 0; i < length; i++) {
    out += ALPHABET[bytes[i] % ALPHABET.length];
  }
  return out;
}
