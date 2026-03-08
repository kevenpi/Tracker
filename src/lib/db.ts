import { sql } from "@vercel/postgres";

export { sql };

export async function ensureTables() {
  await sql`
    CREATE TABLE IF NOT EXISTS campaigns (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      destination_url TEXT NOT NULL,
      status TEXT DEFAULT 'active',
      created_at TIMESTAMP DEFAULT NOW()
    )
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS scans (
      id SERIAL PRIMARY KEY,
      campaign_id TEXT REFERENCES campaigns(id),
      scanned_at TIMESTAMP DEFAULT NOW(),
      user_agent TEXT,
      referrer TEXT
    )
  `;
}

export function generateId(): string {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  let id = "";
  for (let i = 0; i < 8; i++) {
    id += chars[Math.floor(Math.random() * chars.length)];
  }
  return id;
}
