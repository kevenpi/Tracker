import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { generateSlug } from "@/lib/slug";
import { normalizeUrl, parseExpiry } from "@/lib/url";
import { parseCsv, field } from "@/lib/csv";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/qrcodes/import — bulk-create trackers from a CSV upload.
 *
 * multipart/form-data:
 *   file     — the CSV. Columns (case-insensitive, aliases accepted):
 *                name                (required)
 *                destination_url|url (required)
 *                folder|group        (optional — auto-creates the folder)
 *                expires_at|expiry   (optional)
 *   group_id — optional fallback folder for rows without a folder column.
 *
 * Returns { created, skipped, foldersCreated }.
 */
export async function POST(req: NextRequest) {
  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: "Expected multipart form data" }, { status: 400 });
  }

  const file = form.get("file");
  const fallbackGroupId =
    typeof form.get("group_id") === "string" && form.get("group_id")
      ? (form.get("group_id") as string)
      : null;

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No CSV file provided" }, { status: 400 });
  }

  const rows = parseCsv(await file.text());
  if (rows.length === 0) {
    return NextResponse.json(
      { error: "CSV is empty or has no data rows" },
      { status: 400 }
    );
  }

  const first = rows[0];
  const hasName = "name" in first;
  const hasUrl =
    "destination_url" in first || "destinationurl" in first || "url" in first;
  if (!hasName || !hasUrl) {
    return NextResponse.json(
      { error: "CSV must include 'name' and 'destination_url' (or 'url') columns" },
      { status: 400 }
    );
  }

  // Cache existing folders by lower-cased name; create new ones on demand.
  const folderMap = new Map<string, string>();
  for (const g of await prisma.group.findMany()) {
    folderMap.set(g.name.toLowerCase(), g.id);
  }

  let created = 0;
  let skipped = 0;
  const foldersCreated: string[] = [];

  for (const row of rows) {
    const name = field(row, ["name"]).trim();
    const normalized = normalizeUrl(
      field(row, ["destination_url", "destinationurl", "url"])
    );
    if (!name || !normalized) {
      skipped++;
      continue;
    }

    // Folder: CSV column wins, else the dropdown fallback, else root.
    let groupId: string | null = fallbackGroupId;
    const folderName = field(row, ["folder", "group"]).trim();
    if (folderName) {
      const key = folderName.toLowerCase();
      let id = folderMap.get(key);
      if (!id) {
        const g = await prisma.group.create({ data: { name: folderName } });
        id = g.id;
        folderMap.set(key, id);
        foldersCreated.push(folderName);
      }
      groupId = id;
    }

    const expiresAt = parseExpiry(field(row, ["expires_at", "expiry"]));

    // Create with a unique slug, retrying on the rare collision.
    let ok = false;
    for (let attempt = 0; attempt < 5 && !ok; attempt++) {
      try {
        await prisma.qrCode.create({
          data: { slug: generateSlug(), name, destinationUrl: normalized, groupId, expiresAt },
        });
        ok = true;
      } catch (err) {
        if (
          err instanceof Prisma.PrismaClientKnownRequestError &&
          err.code === "P2002"
        ) {
          continue;
        }
        throw err;
      }
    }
    if (ok) created++;
    else skipped++;
  }

  return NextResponse.json({ created, skipped, foldersCreated });
}
