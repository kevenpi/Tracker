import { sql, generateId } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

export async function GET() {
  try {
    const result = await sql`
      SELECT
        c.id,
        c.name,
        c.destination_url,
        c.status,
        c.created_at,
        COUNT(s.id)::int AS scan_count
      FROM campaigns c
      LEFT JOIN scans s ON s.campaign_id = c.id
      GROUP BY c.id, c.name, c.destination_url, c.status, c.created_at
      ORDER BY c.created_at DESC
    `;
    return NextResponse.json(result.rows);
  } catch (error) {
    console.error("Failed to fetch campaigns:", error);
    return NextResponse.json({ error: "Failed to fetch campaigns" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { name, destination_url } = await request.json();

    if (!name || !destination_url) {
      return NextResponse.json(
        { error: "Name and destination_url are required" },
        { status: 400 }
      );
    }

    const id = generateId();

    const result = await sql`
      INSERT INTO campaigns (id, name, destination_url)
      VALUES (${id}, ${name}, ${destination_url})
      RETURNING *
    `;

    return NextResponse.json(result.rows[0], { status: 201 });
  } catch (error) {
    console.error("Failed to create campaign:", error);
    return NextResponse.json({ error: "Failed to create campaign" }, { status: 500 });
  }
}
