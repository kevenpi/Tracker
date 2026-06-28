import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** PATCH /api/groups/:id — rename a folder. Body: { name } */
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const name =
    typeof (body as { name?: unknown })?.name === "string"
      ? (body as { name: string }).name.trim()
      : "";
  if (!name) {
    return NextResponse.json({ error: "Folder name cannot be empty" }, { status: 400 });
  }
  try {
    const group = await prisma.group.update({
      where: { id: params.id },
      data: { name },
    });
    return NextResponse.json({ group });
  } catch {
    return NextResponse.json({ error: "Folder not found" }, { status: 404 });
  }
}

/**
 * DELETE /api/groups/:id — delete a folder.
 * Trackers inside it are NOT deleted; the schema's onDelete: SetNull moves them
 * back to the root.
 */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await prisma.group.delete({ where: { id: params.id } });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Folder not found" }, { status: 404 });
  }
}
