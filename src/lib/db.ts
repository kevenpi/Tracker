import { neon } from "@neondatabase/serverless";

function getConnectionString() {
  const url =
    process.env.DATABASE_URL ||
    process.env.POSTGRES_URL ||
    "";
  if (!url) {
    throw new Error("Missing DATABASE_URL or POSTGRES_URL environment variable");
  }
  return url;
}

export function getDb() {
  return neon(getConnectionString());
}

export function generateId(): string {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  let id = "";
  for (let i = 0; i < 8; i++) {
    id += chars[Math.floor(Math.random() * chars.length)];
  }
  return id;
}
