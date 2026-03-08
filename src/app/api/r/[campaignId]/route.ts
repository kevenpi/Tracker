import { getDb } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";
import { after } from "next/server";

const DEFAULT_URL = "https://www.scholarshare529.com/calkids";

const STATE_ABBREVS: Record<string, string> = {
  alabama: "AL", alaska: "AK", arizona: "AZ", arkansas: "AR", california: "CA",
  colorado: "CO", connecticut: "CT", delaware: "DE", florida: "FL", georgia: "GA",
  hawaii: "HI", idaho: "ID", illinois: "IL", indiana: "IN", iowa: "IA",
  kansas: "KS", kentucky: "KY", louisiana: "LA", maine: "ME", maryland: "MD",
  massachusetts: "MA", michigan: "MI", minnesota: "MN", mississippi: "MS", missouri: "MO",
  montana: "MT", nebraska: "NE", nevada: "NV", "new hampshire": "NH", "new jersey": "NJ",
  "new mexico": "NM", "new york": "NY", "north carolina": "NC", "north dakota": "ND",
  ohio: "OH", oklahoma: "OK", oregon: "OR", pennsylvania: "PA", "rhode island": "RI",
  "south carolina": "SC", "south dakota": "SD", tennessee: "TN", texas: "TX", utah: "UT",
  vermont: "VT", virginia: "VA", washington: "WA", "west virginia": "WV",
  wisconsin: "WI", wyoming: "WY", "district of columbia": "DC",
};

function decodeGeo(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function toStateAbbrev(region: string): string {
  if (!region) return "";
  // Already an abbreviation (2 uppercase letters)
  if (/^[A-Z]{2}$/.test(region)) return region;
  const abbrev = STATE_ABBREVS[region.toLowerCase()];
  return abbrev || region;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ campaignId: string }> }
) {
  const { campaignId } = await params;

  try {
    const sql = getDb();
    const rows = await sql`
      SELECT destination_url, status FROM campaigns WHERE id = ${campaignId}
    `;

    if (rows.length === 0 || rows[0].status !== "active") {
      return NextResponse.redirect(DEFAULT_URL, 302);
    }

    const destination = rows[0].destination_url;
    const userAgent = request.headers.get("user-agent") || "";
    const referrer = request.headers.get("referer") || "";
    const city = decodeGeo(request.headers.get("x-vercel-ip-city") || "");
    const region = toStateAbbrev(decodeGeo(request.headers.get("x-vercel-ip-region") || ""));
    const country = decodeGeo(request.headers.get("x-vercel-ip-country") || "");
    const latitude = request.headers.get("x-vercel-ip-latitude") || "";
    const longitude = request.headers.get("x-vercel-ip-longitude") || "";

    // Fire-and-forget: log the scan without blocking the redirect
    after(async () => {
      try {
        const sql = getDb();
        await sql`
          INSERT INTO scans (campaign_id, user_agent, referrer, city, region, country, latitude, longitude)
          VALUES (${campaignId}, ${userAgent}, ${referrer}, ${city}, ${region}, ${country}, ${latitude}, ${longitude})
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
