import { getDb, generateId } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

export async function GET() {
  try {
    const sql = getDb();
    const rows = await sql`
      SELECT
        g.id,
        g.name,
        g.created_at,
        COUNT(c.id)::int AS campaign_count
      FROM groups g
      LEFT JOIN campaigns c ON c.group_id = g.id
      GROUP BY g.id, g.name, g.created_at
      ORDER BY g.created_at DESC
    `;
    return NextResponse.json(rows);
  } catch (error) {
    console.error("Failed to fetch groups:", error);
    return NextResponse.json({ error: "Failed to fetch groups" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { name } = await request.json();

    if (!name) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }

    const id = generateId();
    const sql = getDb();

    const rows = await sql`
      INSERT INTO groups (id, name)
      VALUES (${id}, ${name})
      RETURNING *
    `;

    return NextResponse.json(rows[0], { status: 201 });
  } catch (error) {
    console.error("Failed to create group:", error);
    return NextResponse.json({ error: "Failed to create group" }, { status: 500 });
  }
}
