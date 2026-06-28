import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { normalizeUrl, parseExpiry } from "@/lib/url";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * PATCH /api/qrcodes/:id — edit a QR code.
 * The slug (and therefore the printed QR image) never changes; only where it
 * points and its metadata can be updated.
 * Body may include: { name?, destinationUrl?, isActive?, expiresAt? }
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const data: {
    name?: string;
    destinationUrl?: string;
    isActive?: boolean;
    expiresAt?: Date | null;
    groupId?: string | null;
  } = {};

  if (typeof body.name === "string") {
    const trimmed = body.name.trim();
    if (!trimmed) {
      return NextResponse.json({ error: "Name cannot be empty" }, { status: 400 });
    }
    data.name = trimmed;
  }

  if (typeof body.destinationUrl === "string") {
    const normalized = normalizeUrl(body.destinationUrl);
    if (!normalized) {
      return NextResponse.json(
        { error: "Destination URL is empty or malformed" },
        { status: 400 }
      );
    }
    data.destinationUrl = normalized;
  }

  if (typeof body.isActive === "boolean") {
    data.isActive = body.isActive;
  }

  // Move between folders. groupId: "<id>" to place in a folder, null/"" for root.
  if ("groupId" in body) {
    data.groupId =
      typeof body.groupId === "string" && body.groupId.trim()
        ? body.groupId.trim()
        : null;
  }

  if ("expiresAt" in body) {
    data.expiresAt =
      body.expiresAt == null || body.expiresAt === ""
        ? null
        : parseExpiry(String(body.expiresAt));
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
  }

  try {
    const updated = await prisma.qrCode.update({ where: { id: params.id }, data });
    return NextResponse.json({ qr: updated });
  } catch {
    return NextResponse.json({ error: "QR code not found" }, { status: 404 });
  }
}

/** DELETE /api/qrcodes/:id — permanently delete a QR code and its scans. */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await prisma.qrCode.delete({ where: { id: params.id } });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "QR code not found" }, { status: 404 });
  }
}
