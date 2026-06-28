import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GET /api/groups — list folders with their tracker counts. */
export async function GET() {
  const groups = await prisma.group.findMany({
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { qrCodes: true } } },
  });
  return NextResponse.json({ groups });
}

/** POST /api/groups — create a folder. Body: { name } */
export async function POST(req: NextRequest) {
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
    return NextResponse.json({ error: "Folder name is required" }, { status: 400 });
  }
  if (name.length > 120) {
    return NextResponse.json(
      { error: "Folder name must be 120 characters or fewer" },
      { status: 400 }
    );
  }
  // Optional parent folder, so folders can be created already nested.
  const rawParent = (body as { parentId?: unknown })?.parentId;
  const parentId =
    typeof rawParent === "string" && rawParent.trim() ? rawParent.trim() : null;

  const group = await prisma.group.create({ data: { name, parentId } });
  return NextResponse.json({ group }, { status: 201 });
}
