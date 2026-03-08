"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import QRCode from "qrcode";

interface Campaign {
  id: string;
  name: string;
  destination_url: string;
  status: string;
  created_at: string;
  scan_count: number;
}

export default function Dashboard() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showQrModal, setShowQrModal] = useState<Campaign | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [createForm, setCreateForm] = useState({ name: "", destination_url: "" });
  const [creating, setCreating] = useState(false);
  const qrCanvasRef = useRef<HTMLCanvasElement>(null);

  const fetchCampaigns = useCallback(async () => {
    try {
      const res = await fetch("/api/campaigns");
      if (res.ok) {
        const data = await res.json();
        setCampaigns(data);
      }
    } catch (err) {
      console.error("Failed to fetch campaigns:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCampaigns();
  }, [fetchCampaigns]);

  useEffect(() => {
    if (showQrModal && qrCanvasRef.current) {
      const host = window.location.host;
      const protocol = window.location.protocol;
      const url = `${protocol}//${host}/api/r/${showQrModal.id}`;
      QRCode.toCanvas(qrCanvasRef.current, url, {
        width: 300,
        margin: 2,
        color: { dark: "#000000", light: "#ffffff" },
      });
    }
  }, [showQrModal]);

  const totalScans = campaigns.reduce((sum, c) => sum + c.scan_count, 0);
  const avgScans = campaigns.length > 0 ? (totalScans / campaigns.length).toFixed(1) : "0";

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    try {
      const res = await fetch("/api/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(createForm),
      });
      if (res.ok) {
        setCreateForm({ name: "", destination_url: "" });
        setShowCreateModal(false);
        await fetchCampaigns();
      }
    } catch (err) {
      console.error("Failed to create campaign:", err);
    } finally {
      setCreating(false);
    }
  }

  async function handleToggleStatus(campaign: Campaign) {
    const newStatus = campaign.status === "active" ? "paused" : "active";
    try {
      const res = await fetch(`/api/campaigns/${campaign.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) await fetchCampaigns();
    } catch (err) {
      console.error("Failed to toggle status:", err);
    }
  }

  async function handleDelete(id: string) {
    try {
      const res = await fetch(`/api/campaigns/${id}`, { method: "DELETE" });
      if (res.ok) {
        setDeleteConfirm(null);
        await fetchCampaigns();
      }
    } catch (err) {
      console.error("Failed to delete campaign:", err);
    }
  }

  function handleDownloadQr() {
    if (!qrCanvasRef.current || !showQrModal) return;
    const link = document.createElement("a");
    link.download = `qr-${showQrModal.id}.png`;
    link.href = qrCanvasRef.current.toDataURL("image/png");
    link.click();
  }

  function handleExportCsv() {
    const headers = ["ID", "Name", "Destination URL", "Status", "Scan Count", "Created At"];
    const rows = campaigns.map((c) => [
      c.id,
      `"${c.name}"`,
      `"${c.destination_url}"`,
      c.status,
      c.scan_count,
      new Date(c.created_at).toISOString(),
    ]);
    const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const link = document.createElement("a");
    link.download = "campaigns.csv";
    link.href = URL.createObjectURL(blob);
    link.click();
    URL.revokeObjectURL(link.href);
  }

  function truncateUrl(url: string, maxLen = 40) {
    return url.length > maxLen ? url.slice(0, maxLen) + "..." : url;
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-gray-100">
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold">Cal-KIDS QR Tracker</h1>
            <p className="text-gray-400 text-sm mt-1">Track QR code scans across outreach campaigns</p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={handleExportCsv}
              disabled={campaigns.length === 0}
              className="px-4 py-2 text-sm bg-zinc-800 hover:bg-zinc-700 rounded-lg border border-zinc-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Export CSV
            </button>
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-500 rounded-lg transition-colors font-medium"
            >
              New Campaign
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-5">
            <p className="text-gray-400 text-sm">Total Campaigns</p>
            <p className="text-3xl font-bold mt-1">{campaigns.length}</p>
          </div>
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-5">
            <p className="text-gray-400 text-sm">Total Scans</p>
            <p className="text-3xl font-bold mt-1">{totalScans}</p>
          </div>
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-5">
            <p className="text-gray-400 text-sm">Avg Scans / Campaign</p>
            <p className="text-3xl font-bold mt-1">{avgScans}</p>
          </div>
        </div>

        {/* Table */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg overflow-hidden">
          {loading ? (
            <div className="p-12 text-center text-gray-500">Loading campaigns...</div>
          ) : campaigns.length === 0 ? (
            <div className="p-12 text-center text-gray-500">
              No campaigns yet. Create one to get started.
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-800 text-left text-gray-400">
                  <th className="px-4 py-3 font-medium">Name</th>
                  <th className="px-4 py-3 font-medium">Destination</th>
                  <th className="px-4 py-3 font-medium text-right">Scans</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Created</th>
                  <th className="px-4 py-3 font-medium text-right">Actions</th>
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
                    <td className="px-4 py-3 text-gray-400">
                      <a
                        href={campaign.destination_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hover:text-gray-200 transition-colors"
                        title={campaign.destination_url}
                      >
                        {truncateUrl(campaign.destination_url)}
                      </a>
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
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => setShowQrModal(campaign)}
                          className="px-2 py-1 text-xs bg-zinc-800 hover:bg-zinc-700 rounded border border-zinc-700 transition-colors"
                          title="View QR code"
                        >
                          QR
                        </button>
                        <button
                          onClick={() => handleToggleStatus(campaign)}
                          className="px-2 py-1 text-xs bg-zinc-800 hover:bg-zinc-700 rounded border border-zinc-700 transition-colors"
                          title={campaign.status === "active" ? "Pause campaign" : "Activate campaign"}
                        >
                          {campaign.status === "active" ? "Pause" : "Activate"}
                        </button>
                        {deleteConfirm === campaign.id ? (
                          <span className="flex items-center gap-1">
                            <button
                              onClick={() => handleDelete(campaign.id)}
                              className="px-2 py-1 text-xs bg-red-900 hover:bg-red-800 text-red-200 rounded border border-red-700 transition-colors"
                            >
                              Confirm
                            </button>
                            <button
                              onClick={() => setDeleteConfirm(null)}
                              className="px-2 py-1 text-xs bg-zinc-800 hover:bg-zinc-700 rounded border border-zinc-700 transition-colors"
                            >
                              Cancel
                            </button>
                          </span>
                        ) : (
                          <button
                            onClick={() => setDeleteConfirm(campaign.id)}
                            className="px-2 py-1 text-xs bg-zinc-800 hover:bg-red-900/50 text-gray-400 hover:text-red-400 rounded border border-zinc-700 hover:border-red-800 transition-colors"
                            title="Delete campaign"
                          >
                            Delete
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Create Campaign Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={() => setShowCreateModal(false)}>
          <div className="bg-zinc-900 border border-zinc-700 rounded-xl p-6 w-full max-w-md mx-4" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-semibold mb-4">Create Campaign</h2>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label htmlFor="name" className="block text-sm text-gray-400 mb-1">Campaign Name</label>
                <input
                  id="name"
                  type="text"
                  required
                  value={createForm.name}
                  onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                  className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm focus:outline-none focus:border-blue-500"
                  placeholder="e.g. Spring 2026 Flyer"
                />
              </div>
              <div>
                <label htmlFor="url" className="block text-sm text-gray-400 mb-1">Destination URL</label>
                <input
                  id="url"
                  type="url"
                  required
                  value={createForm.destination_url}
                  onChange={(e) => setCreateForm({ ...createForm, destination_url: e.target.value })}
                  className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm focus:outline-none focus:border-blue-500"
                  placeholder="https://..."
                />
              </div>
              <div className="flex gap-3 justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 text-sm bg-zinc-800 hover:bg-zinc-700 rounded-lg border border-zinc-700 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-500 rounded-lg transition-colors font-medium disabled:opacity-50"
                >
                  {creating ? "Creating..." : "Create"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* QR Code Modal */}
      {showQrModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={() => setShowQrModal(null)}>
          <div className="bg-zinc-900 border border-zinc-700 rounded-xl p-6 w-full max-w-sm mx-4 text-center" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-semibold mb-1">{showQrModal.name}</h2>
            <p className="text-xs text-gray-400 mb-4 break-all">
              {window.location.protocol}//{window.location.host}/api/r/{showQrModal.id}
            </p>
            <div className="flex justify-center mb-4">
              <canvas ref={qrCanvasRef} className="rounded-lg" />
            </div>
            <div className="flex gap-3 justify-center">
              <button
                onClick={handleDownloadQr}
                className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-500 rounded-lg transition-colors font-medium"
              >
                Download PNG
              </button>
              <button
                onClick={() => setShowQrModal(null)}
                className="px-4 py-2 text-sm bg-zinc-800 hover:bg-zinc-700 rounded-lg border border-zinc-700 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
