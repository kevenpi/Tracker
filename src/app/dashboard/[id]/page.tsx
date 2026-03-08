"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import QRCode from "qrcode";
import ScanMap from "@/components/ScanMap";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

interface Campaign {
  id: string;
  name: string;
  destination_url: string;
  status: string;
  created_at: string;
  scan_count: number;
}

interface Scan {
  id: number;
  scanned_at: string;
  user_agent: string;
  referrer: string;
  city: string;
  region: string;
  country: string;
}

interface DailyCount {
  date: string;
  count: number;
}

interface LocationCount {
  city: string;
  region: string;
  country: string;
  count: number;
  lat: number | null;
  lng: number | null;
}

export default function CampaignDetail() {
  const { id } = useParams<{ id: string }>();
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [scans, setScans] = useState<Scan[]>([]);
  const [dailyCounts, setDailyCounts] = useState<DailyCount[]>([]);
  const [locationCounts, setLocationCounts] = useState<LocationCount[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const qrCanvasRef = useRef<HTMLCanvasElement>(null);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch(`/api/campaigns/${id}/scans`);
      if (!res.ok) {
        setError("Campaign not found");
        return;
      }
      const data = await res.json();
      setCampaign(data.campaign);
      setScans(data.scans);
      setLocationCounts(data.location_counts || []);
      setDailyCounts(
        data.daily_counts.map((d: DailyCount) => ({
          date: new Date(d.date).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
          count: d.count,
        }))
      );
    } catch {
      setError("Failed to load campaign");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    if (campaign && qrCanvasRef.current) {
      const host = window.location.host;
      const protocol = window.location.protocol;
      const url = `${protocol}//${host}/api/r/${campaign.id}`;
      QRCode.toCanvas(qrCanvasRef.current, url, {
        width: 200,
        margin: 2,
        color: { dark: "#000000", light: "#ffffff" },
      });
    }
  }, [campaign]);

  function handleDownloadQr() {
    if (!qrCanvasRef.current || !campaign) return;
    const link = document.createElement("a");
    link.download = `qr-${campaign.id}.png`;
    link.href = qrCanvasRef.current.toDataURL("image/png");
    link.click();
  }

  function formatLocation(scan: Scan) {
    const parts = [scan.city, scan.region, scan.country].filter(Boolean);
    return parts.length > 0 ? parts.join(", ") : "—";
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] text-gray-100 flex items-center justify-center">
        <p className="text-gray-500">Loading...</p>
      </div>
    );
  }

  if (error || !campaign) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] text-gray-100 flex flex-col items-center justify-center gap-4">
        <p className="text-gray-500">{error || "Campaign not found"}</p>
        <Link href="/dashboard" className="text-blue-400 hover:text-blue-300 text-sm">
          Back to dashboard
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-gray-100">
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <Link
            href="/dashboard"
            className="px-3 py-1.5 text-sm bg-zinc-800 hover:bg-zinc-700 rounded-lg border border-zinc-700 transition-colors"
          >
            &larr; Back
          </Link>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold">{campaign.name}</h1>
            <span
              className={`inline-block px-2 py-0.5 text-xs rounded-full font-medium ${
                campaign.status === "active"
                  ? "bg-emerald-900/50 text-emerald-400 border border-emerald-800"
                  : "bg-yellow-900/50 text-yellow-400 border border-yellow-800"
              }`}
            >
              {campaign.status}
            </span>
          </div>
        </div>

        {/* Info row */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-5">
            <p className="text-gray-400 text-sm">Destination</p>
            <a
              href={campaign.destination_url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-400 hover:text-blue-300 text-sm mt-1 block truncate"
              title={campaign.destination_url}
            >
              {campaign.destination_url}
            </a>
          </div>
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-5">
            <p className="text-gray-400 text-sm">Total Scans</p>
            <p className="text-3xl font-bold mt-1">{campaign.scan_count}</p>
          </div>
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-5">
            <p className="text-gray-400 text-sm">Created</p>
            <p className="text-lg font-medium mt-1">
              {new Date(campaign.created_at).toLocaleDateString()}
            </p>
          </div>
        </div>

        {/* Chart + QR side by side */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          {/* Line chart */}
          <div className="col-span-2 bg-zinc-900 border border-zinc-800 rounded-lg p-5">
            <h2 className="text-sm font-medium text-gray-400 mb-4">Scans per Day</h2>
            {dailyCounts.length === 0 ? (
              <div className="h-48 flex items-center justify-center text-gray-600 text-sm">
                No scan data yet
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={240}>
                <LineChart data={dailyCounts}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                  <XAxis
                    dataKey="date"
                    tick={{ fill: "#71717a", fontSize: 12 }}
                    axisLine={{ stroke: "#27272a" }}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fill: "#71717a", fontSize: 12 }}
                    axisLine={{ stroke: "#27272a" }}
                    tickLine={false}
                    allowDecimals={false}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#18181b",
                      border: "1px solid #3f3f46",
                      borderRadius: "8px",
                      fontSize: "12px",
                    }}
                    labelStyle={{ color: "#a1a1aa" }}
                    itemStyle={{ color: "#3b82f6" }}
                  />
                  <Line
                    type="monotone"
                    dataKey="count"
                    stroke="#3b82f6"
                    strokeWidth={2}
                    dot={{ fill: "#3b82f6", r: 3 }}
                    activeDot={{ r: 5 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* QR Code */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-5 flex flex-col items-center">
            <h2 className="text-sm font-medium text-gray-400 mb-4">QR Code</h2>
            <canvas ref={qrCanvasRef} className="rounded-lg mb-4" />
            <button
              onClick={handleDownloadQr}
              className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-500 rounded-lg transition-colors font-medium"
            >
              Download PNG
            </button>
          </div>
        </div>

        {/* Scan map */}
        <ScanMap locations={locationCounts} />

        {/* Location breakdown */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg overflow-hidden mb-8">
          <div className="px-4 py-3 border-b border-zinc-800">
            <h2 className="text-sm font-medium text-gray-400">Scans by Location</h2>
          </div>
          {locationCounts.length === 0 || locationCounts.every((l) => !l.city && !l.region && !l.country) ? (
            <div className="p-8 text-center text-gray-600 text-sm">No location data yet</div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-800 text-left text-gray-400">
                  <th className="px-4 py-3 font-medium">City</th>
                  <th className="px-4 py-3 font-medium">Region</th>
                  <th className="px-4 py-3 font-medium">Country</th>
                  <th className="px-4 py-3 font-medium text-right">Scans</th>
                </tr>
              </thead>
              <tbody>
                {locationCounts
                  .filter((l) => l.city || l.region || l.country)
                  .map((loc, i) => (
                    <tr key={i} className="border-b border-zinc-800/50 hover:bg-zinc-800/30">
                      <td className="px-4 py-3 text-gray-300">{loc.city || "—"}</td>
                      <td className="px-4 py-3 text-gray-400">{loc.region || "—"}</td>
                      <td className="px-4 py-3 text-gray-400">{loc.country || "—"}</td>
                      <td className="px-4 py-3 text-right tabular-nums">{loc.count}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Recent scans table */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg overflow-hidden">
          <div className="px-4 py-3 border-b border-zinc-800">
            <h2 className="text-sm font-medium text-gray-400">Recent Scans</h2>
          </div>
          {scans.length === 0 ? (
            <div className="p-12 text-center text-gray-600 text-sm">No scans recorded yet</div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-800 text-left text-gray-400">
                  <th className="px-4 py-3 font-medium">Timestamp</th>
                  <th className="px-4 py-3 font-medium">Location</th>
                  <th className="px-4 py-3 font-medium">User Agent</th>
                </tr>
              </thead>
              <tbody>
                {scans.map((scan) => (
                  <tr key={scan.id} className="border-b border-zinc-800/50 hover:bg-zinc-800/30">
                    <td className="px-4 py-3 text-gray-300 whitespace-nowrap">
                      {new Date(scan.scanned_at).toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-gray-400 whitespace-nowrap">
                      {formatLocation(scan)}
                    </td>
                    <td className="px-4 py-3 text-gray-500 truncate max-w-md" title={scan.user_agent}>
                      {scan.user_agent || "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
