import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { generateSlug } from "@/lib/slug";
import { normalizeUrl, parseExpiry } from "@/lib/url";
import { shortUrl, qrPngDataUrl, qrSvgString } from "@/lib/qr";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GET /api/qrcodes — list all QR codes with scan counts (newest first). */
export async function GET() {
  const codes = await prisma.qrCode.findMany({
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { scans: true } } },
  });
  return NextResponse.json({ codes });
}

/** POST /api/qrcodes — create a QR code. Body: { name, destinationUrl, expiresAt? } */
export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { name, destinationUrl, expiresAt, groupId } = (body ?? {}) as Record<
    string,
    unknown
  >;

  const trimmedName = typeof name === "string" ? name.trim() : "";
  if (!trimmedName) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }
  if (trimmedName.length > 120) {
    return NextResponse.json(
      { error: "Name must be 120 characters or fewer" },
      { status: 400 }
    );
  }

  const normalized = normalizeUrl(
    typeof destinationUrl === "string" ? destinationUrl : null
  );
  if (!normalized) {
    return NextResponse.json(
      { error: "Destination URL is empty or malformed" },
      { status: 400 }
    );
  }

  const expiry = parseExpiry(
    typeof expiresAt === "string" ? expiresAt : null
  );

  const groupIdValue =
    typeof groupId === "string" && groupId.trim() ? groupId.trim() : null;

  // Create with a unique slug, retrying on the rare collision.
  let created = null;
  for (let attempt = 0; attempt < 5; attempt++) {
    const slug = generateSlug();
    try {
      created = await prisma.qrCode.create({
        data: {
          slug,
          name: trimmedName,
          destinationUrl: normalized,
          expiresAt: expiry,
          groupId: groupIdValue,
        },
      });
      break;
    } catch (err) {
      if (
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === "P2002"
      ) {
        continue; // slug collision — try another
      }
      throw err;
    }
  }

  if (!created) {
    return NextResponse.json(
      { error: "Could not generate a unique slug, please try again" },
      { status: 500 }
    );
  }

  const url = shortUrl(created.slug);
  const [pngDataUrl, svg] = await Promise.all([
    qrPngDataUrl(url),
    qrSvgString(url),
  ]);

  return NextResponse.json(
    { qr: created, shortUrl: url, pngDataUrl, svg },
    { status: 201 }
  );
}
