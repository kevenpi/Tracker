import { sql } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";
import { after } from "next/server";

const DEFAULT_URL = "https://www.scholarshare529.com/calkids";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ campaignId: string }> }
) {
  const { campaignId } = await params;

  try {
    const result = await sql`
      SELECT destination_url, status FROM campaigns WHERE id = ${campaignId}
    `;

    if (result.rows.length === 0 || result.rows[0].status !== "active") {
      return NextResponse.redirect(DEFAULT_URL, 302);
    }

    const destination = result.rows[0].destination_url;
    const userAgent = request.headers.get("user-agent") || "";
    const referrer = request.headers.get("referer") || "";

    // Fire-and-forget: log the scan without blocking the redirect
    after(async () => {
      try {
        await sql`
          INSERT INTO scans (campaign_id, user_agent, referrer)
          VALUES (${campaignId}, ${userAgent}, ${referrer})
        `;
      } catch (e) {
        console.error("Failed to log scan:", e);
      }
    });

    return NextResponse.redirect(destination, 302);
  } catch {
    return NextResponse.redirect(DEFAULT_URL, 302);
  }
}
