"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import Link from "next/link";
import QRCode from "qrcode";

interface Campaign {
  id: string;
  name: string;
  destination_url: string;
  status: string;
  created_at: string;
  scan_count: number;
  group_id: string | null;
  group_name: string | null;
}

interface Group {
  id: string;
  name: string;
  created_at: string;
  campaign_count: number;
}

export default function Dashboard() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showCreateGroupModal, setShowCreateGroupModal] = useState(false);
  const [showQrModal, setShowQrModal] = useState<Campaign | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [editCampaign, setEditCampaign] = useState<Campaign | null>(null);
  const [editForm, setEditForm] = useState({ name: "", destination_url: "", group_id: "" });
  const [saving, setSaving] = useState(false);
  const [createForm, setCreateForm] = useState({ name: "", destination_url: "", group_id: "" });
  const [creating, setCreating] = useState(false);
  const [groupName, setGroupName] = useState("");
  const [creatingGroup, setCreatingGroup] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedGroupId, setSelectedGroupId] = useState("");
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

  const fetchGroups = useCallback(async () => {
    try {
      const res = await fetch("/api/groups");
      if (res.ok) {
        const data = await res.json();
        setGroups(data);
      }
    } catch (err) {
      console.error("Failed to fetch groups:", err);
    }
  }, []);

  useEffect(() => {
    fetchCampaigns();
    fetchGroups();
  }, [fetchCampaigns, fetchGroups]);

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

  const filteredCampaigns = useMemo(() => {
    let result = campaigns;
    if (selectedGroupId) {
      result = result.filter((c) => c.group_id === selectedGroupId);
    }
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          c.destination_url.toLowerCase().includes(q) ||
          (c.group_name && c.group_name.toLowerCase().includes(q))
      );
    }
    return result;
  }, [campaigns, selectedGroupId, searchQuery]);

  const totalScans = campaigns.reduce((sum, c) => sum + c.scan_count, 0);
  const avgScans = campaigns.length > 0 ? (totalScans / campaigns.length).toFixed(1) : "0";

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    try {
      const res = await fetch("/api/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: createForm.name,
          destination_url: createForm.destination_url,
          group_id: createForm.group_id || null,
        }),
      });
      if (res.ok) {
        setCreateForm({ name: "", destination_url: "", group_id: "" });
        setShowCreateModal(false);
        await fetchCampaigns();
        await fetchGroups();
      }
    } catch (err) {
      console.error("Failed to create campaign:", err);
    } finally {
      setCreating(false);
    }
  }

  async function handleCreateGroup(e: React.FormEvent) {
    e.preventDefault();
    setCreatingGroup(true);
    try {
      const res = await fetch("/api/groups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: groupName }),
      });
      if (res.ok) {
        setGroupName("");
        setShowCreateGroupModal(false);
        await fetchGroups();
      }
    } catch (err) {
      console.error("Failed to create group:", err);
    } finally {
      setCreatingGroup(false);
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
        await fetchGroups();
      }
    } catch (err) {
      console.error("Failed to delete campaign:", err);
    }
  }

  function openEdit(campaign: Campaign) {
    setEditCampaign(campaign);
    setEditForm({
      name: campaign.name,
      destination_url: campaign.destination_url,
      group_id: campaign.group_id || "",
    });
  }

  async function handleEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editCampaign) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/campaigns/${editCampaign.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editForm.name,
          destination_url: editForm.destination_url,
          group_id: editForm.group_id || null,
        }),
      });
      if (res.ok) {
        setEditCampaign(null);
        await fetchCampaigns();
        await fetchGroups();
      }
    } catch (err) {
      console.error("Failed to update campaign:", err);
    } finally {
      setSaving(false);
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
    const headers = ["ID", "Name", "Destination URL", "Status", "Group", "Scan Count", "Created At"];
    const rows = campaigns.map((c) => [
      c.id,
      `"${c.name}"`,
      `"${c.destination_url}"`,
      c.status,
      `"${c.group_name || ""}"`,
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

  function truncateUrl(url: string, maxLen = 35) {
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
              onClick={() => setShowCreateGroupModal(true)}
              className="px-4 py-2 text-sm bg-zinc-800 hover:bg-zinc-700 rounded-lg border border-zinc-700 transition-colors"
            >
              New Group
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

        {/* Search and filter bar */}
        <div className="flex gap-3 mb-4">
          <input
            type="text"
            placeholder="Search campaigns..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1 px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-sm focus:outline-none focus:border-zinc-600 placeholder-gray-600"
          />
          <select
            value={selectedGroupId}
            onChange={(e) => setSelectedGroupId(e.target.value)}
            className="px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-sm focus:outline-none focus:border-zinc-600 text-gray-300"
          >
            <option value="">All groups</option>
            {groups.map((g) => (
              <option key={g.id} value={g.id}>
                {g.name}
              </option>
            ))}
          </select>
        </div>

        {/* Table */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg overflow-hidden">
          {loading ? (
            <div className="p-12 text-center text-gray-500">Loading campaigns...</div>
          ) : filteredCampaigns.length === 0 ? (
            <div className="p-12 text-center text-gray-500">
              {campaigns.length === 0
                ? "No campaigns yet. Create one to get started."
                : "No campaigns match your search."}
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-800 text-left text-gray-400">
                  <th className="px-4 py-3 font-medium">Name</th>
                  <th className="px-4 py-3 font-medium">Group</th>
                  <th className="px-4 py-3 font-medium">Destination</th>
                  <th className="px-4 py-3 font-medium text-right">Scans</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Created</th>
                  <th className="px-4 py-3 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredCampaigns.map((campaign) => (
                  <tr key={campaign.id} className="border-b border-zinc-800/50 hover:bg-zinc-800/30">
                    <td className="px-4 py-3 font-medium">
                      <Link href={`/dashboard/${campaign.id}`} className="hover:text-blue-400 transition-colors">
                        {campaign.name}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-gray-400">
                      {campaign.group_name ? (
                        <Link
                          href={`/dashboard/groups/${campaign.group_id}`}
                          className="hover:text-blue-400 transition-colors"
                        >
                          {campaign.group_name}
                        </Link>
                      ) : (
                        <span className="text-gray-600">—</span>
                      )}
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
                          onClick={() => openEdit(campaign)}
                          className="px-2 py-1 text-xs bg-zinc-800 hover:bg-zinc-700 rounded border border-zinc-700 transition-colors"
                          title="Edit campaign"
                        >
                          Edit
                        </button>
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
              <div>
                <label htmlFor="group" className="block text-sm text-gray-400 mb-1">Group (optional)</label>
                <select
                  id="group"
                  value={createForm.group_id}
                  onChange={(e) => setCreateForm({ ...createForm, group_id: e.target.value })}
                  className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm focus:outline-none focus:border-blue-500 text-gray-300"
                >
                  <option value="">None</option>
                  {groups.map((g) => (
                    <option key={g.id} value={g.id}>{g.name}</option>
                  ))}
                </select>
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

      {/* Create Group Modal */}
      {showCreateGroupModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={() => setShowCreateGroupModal(false)}>
          <div className="bg-zinc-900 border border-zinc-700 rounded-xl p-6 w-full max-w-md mx-4" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-semibold mb-4">Create Group</h2>
            <form onSubmit={handleCreateGroup} className="space-y-4">
              <div>
                <label htmlFor="group-name" className="block text-sm text-gray-400 mb-1">Group Name</label>
                <input
                  id="group-name"
                  type="text"
                  required
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                  className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm focus:outline-none focus:border-blue-500"
                  placeholder="e.g. Library Events"
                />
              </div>
              <div className="flex gap-3 justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateGroupModal(false)}
                  className="px-4 py-2 text-sm bg-zinc-800 hover:bg-zinc-700 rounded-lg border border-zinc-700 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creatingGroup}
                  className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-500 rounded-lg transition-colors font-medium disabled:opacity-50"
                >
                  {creatingGroup ? "Creating..." : "Create"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Campaign Modal */}
      {editCampaign && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={() => setEditCampaign(null)}>
          <div className="bg-zinc-900 border border-zinc-700 rounded-xl p-6 w-full max-w-md mx-4" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-semibold mb-4">Edit Campaign</h2>
            <form onSubmit={handleEdit} className="space-y-4">
              <div>
                <label htmlFor="edit-name" className="block text-sm text-gray-400 mb-1">Campaign Name</label>
                <input
                  id="edit-name"
                  type="text"
                  required
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm focus:outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label htmlFor="edit-url" className="block text-sm text-gray-400 mb-1">Destination URL</label>
                <input
                  id="edit-url"
                  type="url"
                  required
                  value={editForm.destination_url}
                  onChange={(e) => setEditForm({ ...editForm, destination_url: e.target.value })}
                  className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm focus:outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label htmlFor="edit-group" className="block text-sm text-gray-400 mb-1">Group</label>
                <select
                  id="edit-group"
                  value={editForm.group_id}
                  onChange={(e) => setEditForm({ ...editForm, group_id: e.target.value })}
                  className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm focus:outline-none focus:border-blue-500 text-gray-300"
                >
                  <option value="">None</option>
                  {groups.map((g) => (
                    <option key={g.id} value={g.id}>{g.name}</option>
                  ))}
                </select>
              </div>
              <div className="flex gap-3 justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setEditCampaign(null)}
                  className="px-4 py-2 text-sm bg-zinc-800 hover:bg-zinc-700 rounded-lg border border-zinc-700 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-500 rounded-lg transition-colors font-medium disabled:opacity-50"
                >
                  {saving ? "Saving..." : "Save"}
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
