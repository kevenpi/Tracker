import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * PATCH /api/groups/:id — rename and/or move a folder.
 * Body may include: { name?, parentId? } where parentId null/"" means top level.
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

  const data: { name?: string; parentId?: string | null } = {};

  if (typeof body.name === "string") {
    const trimmed = body.name.trim();
    if (!trimmed) {
      return NextResponse.json(
        { error: "Folder name cannot be empty" },
        { status: 400 }
      );
    }
    data.name = trimmed;
  }

  if ("parentId" in body) {
    const newParent =
      typeof body.parentId === "string" && body.parentId.trim()
        ? body.parentId.trim()
        : null;

    if (newParent === params.id) {
      return NextResponse.json(
        { error: "A folder can't be moved into itself" },
        { status: 400 }
      );
    }

    // Walk up from the proposed parent; if we reach this folder, the move would
    // create a cycle (moving a folder into its own descendant).
    if (newParent) {
      let cursor: string | null = newParent;
      let depth = 0;
      while (cursor) {
        if (cursor === params.id) {
          return NextResponse.json(
            { error: "A folder can't be moved into its own subfolder" },
            { status: 400 }
          );
        }
        const p: { parentId: string | null } | null =
          await prisma.group.findUnique({
            where: { id: cursor },
            select: { parentId: true },
          });
        if (!p) break;
        cursor = p.parentId;
        if (++depth > 100) break;
      }
    }

    data.parentId = newParent;
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
  }

  try {
    const group = await prisma.group.update({
      where: { id: params.id },
      data,
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
