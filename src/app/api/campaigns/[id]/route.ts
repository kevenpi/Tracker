import { sql } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    await sql`DELETE FROM scans WHERE campaign_id = ${id}`;
    await sql`DELETE FROM campaigns WHERE id = ${id}`;
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete campaign:", error);
    return NextResponse.json({ error: "Failed to delete campaign" }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const body = await request.json();

    if (body.status) {
      await sql`UPDATE campaigns SET status = ${body.status} WHERE id = ${id}`;
    }
    if (body.name !== undefined) {
      await sql`UPDATE campaigns SET name = ${body.name} WHERE id = ${id}`;
    }
    if (body.destination_url !== undefined) {
      await sql`UPDATE campaigns SET destination_url = ${body.destination_url} WHERE id = ${id}`;
    }

    const result = await sql`SELECT * FROM campaigns WHERE id = ${id}`;

    if (result.rows.length === 0) {
      return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
    }

    return NextResponse.json(result.rows[0]);
  } catch (error) {
    console.error("Failed to update campaign:", error);
    return NextResponse.json({ error: "Failed to update campaign" }, { status: 500 });
  }
}
