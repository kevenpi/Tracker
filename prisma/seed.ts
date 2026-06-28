import { PrismaClient } from "@prisma/client";
import { randomBytes } from "crypto";

const prisma = new PrismaClient();

const ALPHABET =
  "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";
function slug(len = 6): string {
  const b = randomBytes(len);
  let s = "";
  for (let i = 0; i < len; i++) s += ALPHABET[b[i] % ALPHABET.length];
  return s;
}

// Deterministic-ish PRNG so re-seeding produces sensible spreads.
function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

const LOCATIONS = [
  { country: "US", region: "California", city: "San Francisco", lat: 37.77, lng: -122.42 },
  { country: "US", region: "New York", city: "New York", lat: 40.71, lng: -74.0 },
  { country: "GB", region: "England", city: "London", lat: 51.51, lng: -0.13 },
  { country: "DE", region: "Berlin", city: "Berlin", lat: 52.52, lng: 13.4 },
  { country: "JP", region: "Tokyo", city: "Tokyo", lat: 35.68, lng: 139.69 },
  { country: "IN", region: "Maharashtra", city: "Mumbai", lat: 19.07, lng: 72.87 },
  { country: "BR", region: "Sao Paulo", city: "Sao Paulo", lat: -23.55, lng: -46.63 },
];

const AGENTS = [
  {
    ua: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1",
    deviceType: "mobile",
    os: "iOS 17.5",
    browser: "Mobile Safari 17.5",
  },
  {
    ua: "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Mobile Safari/537.36",
    deviceType: "mobile",
    os: "Android 14",
    browser: "Chrome 126.0.0.0",
  },
  {
    ua: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
    deviceType: "desktop",
    os: "Mac OS 10.15.7",
    browser: "Chrome 126.0.0.0",
  },
  {
    ua: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36 Edg/126.0.0.0",
    deviceType: "desktop",
    os: "Windows 10",
    browser: "Edge 126.0.0.0",
  },
  {
    ua: "Mozilla/5.0 (iPad; CPU OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1",
    deviceType: "tablet",
    os: "iOS 17.5",
    browser: "Mobile Safari 17.5",
  },
];

const REFERRERS = [null, "https://twitter.com/", "https://www.google.com/", null, null];

function randomIp(): string {
  return `${1 + Math.floor(Math.random() * 223)}.${Math.floor(
    Math.random() * 256
  )}.${Math.floor(Math.random() * 256)}.${Math.floor(Math.random() * 256)}`;
}

async function seedScans(qrCodeId: string, count: number, days: number) {
  const now = Date.now();
  // A small pool of IPs so "unique vs total" is meaningful.
  const ipPool = Array.from({ length: Math.ceil(count / 3) }, () => randomIp());

  const rows = Array.from({ length: count }).map(() => {
    const loc = pick(LOCATIONS);
    const agent = pick(AGENTS);
    const ageMs = Math.random() * days * 86_400_000;
    return {
      qrCodeId,
      scannedAt: new Date(now - ageMs),
      ipAddress: pick(ipPool),
      country: loc.country,
      region: loc.region,
      city: loc.city,
      lat: loc.lat,
      lng: loc.lng,
      userAgent: agent.ua,
      deviceType: agent.deviceType,
      os: agent.os,
      browser: agent.browser,
      referrer: pick(REFERRERS),
    };
  });

  await prisma.scan.createMany({ data: rows });
}

async function main() {
  console.log("Seeding…");

  // Start clean so re-running the seed is idempotent.
  await prisma.scan.deleteMany();
  await prisma.qrCode.deleteMany();
  await prisma.group.deleteMany();

  // Two folders + one tracker left at the root.
  const marketing = await prisma.group.create({ data: { name: "Marketing" } });
  const events = await prisma.group.create({ data: { name: "Events" } });

  const flyer = await prisma.qrCode.create({
    data: {
      slug: slug(),
      name: "Spring Campaign Flyer",
      destinationUrl: "https://example.com/spring-sale",
      groupId: marketing.id,
    },
  });
  await seedScans(flyer.id, 140, 30);

  const social = await prisma.qrCode.create({
    data: {
      slug: slug(),
      name: "Instagram Bio Link",
      destinationUrl: "https://example.com/linktree",
      groupId: marketing.id,
    },
  });
  await seedScans(social.id, 73, 21);

  const event = await prisma.qrCode.create({
    data: {
      slug: slug(),
      name: "Conference Booth",
      destinationUrl: "https://example.com/demo-signup",
      expiresAt: new Date(Date.now() + 60 * 86_400_000),
      groupId: events.id,
    },
  });
  await seedScans(event.id, 48, 2); // recent burst → hourly chart

  // A loose tracker at the root (no folder), and a disabled one.
  const newsletter = await prisma.qrCode.create({
    data: {
      slug: slug(),
      name: "Newsletter Signup",
      destinationUrl: "https://example.com/subscribe",
    },
  });
  await seedScans(newsletter.id, 31, 14);

  const old = await prisma.qrCode.create({
    data: {
      slug: slug(),
      name: "Old Menu (disabled)",
      destinationUrl: "https://example.com/menu-v1",
      isActive: false,
    },
  });
  await seedScans(old.id, 12, 90);

  const totalScans = await prisma.scan.count();
  console.log(
    `Done. Created 2 folders, 5 QR codes and ${totalScans} scans.\n` +
      `  Marketing/  • ${flyer.name}   /r/${flyer.slug}\n` +
      `              • ${social.name}   /r/${social.slug}\n` +
      `  Events/     • ${event.name}   /r/${event.slug}\n` +
      `  (root)      • ${newsletter.name}   /r/${newsletter.slug}\n` +
      `  (root)      • ${old.name}   /r/${old.slug}`
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
