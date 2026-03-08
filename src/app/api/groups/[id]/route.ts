import { getDb } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const sql = getDb();

    const groupRows = await sql`
      SELECT * FROM groups WHERE id = ${id}
    `;

    if (groupRows.length === 0) {
      return NextResponse.json({ error: "Group not found" }, { status: 404 });
    }

    const campaigns = await sql`
      SELECT
        c.id,
        c.name,
        c.destination_url,
        c.status,
        c.created_at,
        COUNT(s.id)::int AS scan_count
      FROM campaigns c
      LEFT JOIN scans s ON s.campaign_id = c.id
      WHERE c.group_id = ${id}
      GROUP BY c.id, c.name, c.destination_url, c.status, c.created_at
      ORDER BY c.created_at DESC
    `;

    const dailyCounts = await sql`
      SELECT
        DATE(s.scanned_at) AS date,
        COUNT(*)::int AS count
      FROM scans s
      INNER JOIN campaigns c ON c.id = s.campaign_id
      WHERE c.group_id = ${id}
      GROUP BY DATE(s.scanned_at)
      ORDER BY date ASC
    `;

    const locationCounts = await sql`
      SELECT
        s.city,
        s.region,
        s.country,
        COUNT(*)::int AS count,
        AVG(NULLIF(s.latitude, '')::float) AS lat,
        AVG(NULLIF(s.longitude, '')::float) AS lng
      FROM scans s
      INNER JOIN campaigns c ON c.id = s.campaign_id
      WHERE c.group_id = ${id}
      GROUP BY s.city, s.region, s.country
      ORDER BY count DESC
    `;

    return NextResponse.json({
      group: groupRows[0],
      campaigns,
      daily_counts: dailyCounts,
      location_counts: locationCounts,
    });
  } catch (error) {
    console.error("Failed to fetch group detail:", error);
    return NextResponse.json({ error: "Failed to fetch group detail" }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const sql = getDb();
    await sql`UPDATE campaigns SET group_id = NULL WHERE group_id = ${id}`;
    await sql`DELETE FROM groups WHERE id = ${id}`;
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete group:", error);
    return NextResponse.json({ error: "Failed to delete group" }, { status: 500 });
  }
}
