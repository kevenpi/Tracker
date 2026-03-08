import { getDb, generateId } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

function parseCsv(text: string): Record<string, string>[] {
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2) return [];

  const headers = lines[0].split(",").map((h) => h.trim().toLowerCase().replace(/^"(.*)"$/, "$1"));
  const rows: Record<string, string>[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values: string[] = [];
    let current = "";
    let inQuotes = false;

    for (const char of lines[i]) {
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === "," && !inQuotes) {
        values.push(current.trim());
        current = "";
      } else {
        current += char;
      }
    }
    values.push(current.trim());

    if (values.length >= headers.length) {
      const row: Record<string, string> = {};
      headers.forEach((h, idx) => {
        row[h] = values[idx] || "";
      });
      rows.push(row);
    }
  }

  return rows;
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const text = await file.text();
    const rows = parseCsv(text);

    if (rows.length === 0) {
      return NextResponse.json({ error: "CSV is empty or has no data rows" }, { status: 400 });
    }

    // Validate required columns
    const hasName = "name" in rows[0];
    const hasUrl = "destination_url" in rows[0];
    if (!hasName || !hasUrl) {
      return NextResponse.json(
        { error: "CSV must have 'name' and 'destination_url' columns" },
        { status: 400 }
      );
    }

    const sql = getDb();
    const hasGroupCol = "group" in rows[0];

    // Cache existing groups and create new ones as needed
    const groupMap = new Map<string, string>();
    if (hasGroupCol) {
      const existingGroups = await sql`SELECT id, name FROM groups`;
      for (const g of existingGroups) {
        groupMap.set(g.name.toLowerCase(), g.id);
      }
    }

    let created = 0;
    let skipped = 0;
    const groupsCreated: string[] = [];

    for (const row of rows) {
      const name = row.name?.trim();
      const destinationUrl = row.destination_url?.trim();

      if (!name || !destinationUrl) {
        skipped++;
        continue;
      }

      let groupId: string | null = null;

      if (hasGroupCol && row.group?.trim()) {
        const groupName = row.group.trim();
        const key = groupName.toLowerCase();

        if (groupMap.has(key)) {
          groupId = groupMap.get(key)!;
        } else {
          // Create the group
          const newGroupId = generateId();
          await sql`INSERT INTO groups (id, name) VALUES (${newGroupId}, ${groupName})`;
          groupMap.set(key, newGroupId);
          groupId = newGroupId;
          groupsCreated.push(groupName);
        }
      }

      const id = generateId();
      await sql`
        INSERT INTO campaigns (id, name, destination_url, group_id)
        VALUES (${id}, ${name}, ${destinationUrl}, ${groupId})
      `;
      created++;
    }

    return NextResponse.json({
      created,
      skipped,
      groups_created: groupsCreated,
    });
  } catch (error) {
    console.error("Failed to import campaigns:", error);
    return NextResponse.json({ error: "Failed to import campaigns" }, { status: 500 });
  }
}
