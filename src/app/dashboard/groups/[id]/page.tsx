"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

interface Group {
  id: string;
  name: string;
  created_at: string;
}

interface Campaign {
  id: string;
  name: string;
  destination_url: string;
  status: string;
  created_at: string;
  scan_count: number;
}

interface DailyCount {
  date: string;
  count: number;
}

export default function GroupDetail() {
  const { id } = useParams<{ id: string }>();
  const [group, setGroup] = useState<Group | null>(null);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [dailyCounts, setDailyCounts] = useState<DailyCount[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch(`/api/groups/${id}`);
      if (!res.ok) {
        setError("Group not found");
        return;
      }
      const data = await res.json();
      setGroup(data.group);
      setCampaigns(data.campaigns);
      setDailyCounts(
        data.daily_counts.map((d: DailyCount) => ({
          date: new Date(d.date).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
          count: d.count,
        }))
      );
    } catch {
      setError("Failed to load group");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const totalScans = campaigns.reduce((sum, c) => sum + c.scan_count, 0);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] text-gray-100 flex items-center justify-center">
        <p className="text-gray-500">Loading...</p>
      </div>
    );
  }

  if (error || !group) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] text-gray-100 flex flex-col items-center justify-center gap-4">
        <p className="text-gray-500">{error || "Group not found"}</p>
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
          <h1 className="text-2xl font-bold">{group.name}</h1>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-5">
            <p className="text-gray-400 text-sm">Campaigns</p>
            <p className="text-3xl font-bold mt-1">{campaigns.length}</p>
          </div>
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-5">
            <p className="text-gray-400 text-sm">Total Scans</p>
            <p className="text-3xl font-bold mt-1">{totalScans}</p>
          </div>
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-5">
            <p className="text-gray-400 text-sm">Created</p>
            <p className="text-lg font-medium mt-1">
              {new Date(group.created_at).toLocaleDateString()}
            </p>
          </div>
        </div>

        {/* Combined line chart */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-5 mb-8">
          <h2 className="text-sm font-medium text-gray-400 mb-4">Combined Scans per Day</h2>
          {dailyCounts.length === 0 ? (
            <div className="h-48 flex items-center justify-center text-gray-600 text-sm">
              No scan data yet
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={280}>
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

        {/* Campaigns in group */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg overflow-hidden">
          <div className="px-4 py-3 border-b border-zinc-800">
            <h2 className="text-sm font-medium text-gray-400">Campaigns in this Group</h2>
          </div>
          {campaigns.length === 0 ? (
            <div className="p-12 text-center text-gray-600 text-sm">No campaigns in this group</div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-800 text-left text-gray-400">
                  <th className="px-4 py-3 font-medium">Name</th>
                  <th className="px-4 py-3 font-medium">Destination</th>
                  <th className="px-4 py-3 font-medium text-right">Scans</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Created</th>
                </tr>
              </thead>
              <tbody>
                {campaigns.map((campaign) => (
                  <tr key={campaign.id} className="border-b border-zinc-800/50 hover:bg-zinc-800/30">
                    <td className="px-4 py-3 font-medium">
                      <Link href={`/dashboard/${campaign.id}`} className="hover:text-blue-400 transition-colors">
                        {campaign.name}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-gray-400 truncate max-w-xs" title={campaign.destination_url}>
                      {campaign.destination_url}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums">{campaign.scan_count}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-block px-2 py-0.5 text-xs rounded-full font-medium ${
                          campaign.status === "active"
                            ? "bg-emerald-900/50 text-emerald-400 border border-emerald-800"
                            : "bg-yellow-900/50 text-yellow-400 border border-yellow-800"
                        }`}
                      >
                        {campaign.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-400">
                      {new Date(campaign.created_at).toLocaleDateString()}
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
