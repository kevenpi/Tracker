import { getDb } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const sql = getDb();

    const campaignRows = await sql`
      SELECT
        c.id,
        c.name,
        c.destination_url,
        c.status,
        c.created_at,
        c.group_id,
        COUNT(s.id)::int AS scan_count
      FROM campaigns c
      LEFT JOIN scans s ON s.campaign_id = c.id
      WHERE c.id = ${id}
      GROUP BY c.id, c.name, c.destination_url, c.status, c.created_at, c.group_id
    `;

    if (campaignRows.length === 0) {
      return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
    }

    const scans = await sql`
      SELECT id, scanned_at, user_agent, referrer, city, region, country
      FROM scans
      WHERE campaign_id = ${id}
      ORDER BY scanned_at DESC
      LIMIT 100
    `;

    const dailyCounts = await sql`
      SELECT
        DATE(scanned_at) AS date,
        COUNT(*)::int AS count
      FROM scans
      WHERE campaign_id = ${id}
      GROUP BY DATE(scanned_at)
      ORDER BY date ASC
    `;

    const locationCounts = await sql`
      SELECT
        city,
        region,
        country,
        COUNT(*)::int AS count,
        AVG(NULLIF(latitude, '')::float) AS lat,
        AVG(NULLIF(longitude, '')::float) AS lng
      FROM scans
      WHERE campaign_id = ${id}
      GROUP BY city, region, country
      ORDER BY count DESC
    `;

    return NextResponse.json({
      campaign: campaignRows[0],
      scans,
      daily_counts: dailyCounts,
      location_counts: locationCounts,
    });
  } catch (error) {
    console.error("Failed to fetch campaign detail:", error);
    return NextResponse.json({ error: "Failed to fetch campaign detail" }, { status: 500 });
  }
}
