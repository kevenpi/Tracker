"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Props = {
  id: string;
  name: string;
  destinationUrl: string;
  isActive: boolean;
  expiresAt: string | null; // ISO date (yyyy-mm-dd) or null
};

export default function QrSettings(props: Props) {
  const router = useRouter();
  const [name, setName] = useState(props.name);
  const [destinationUrl, setDestinationUrl] = useState(props.destinationUrl);
  const [expiresAt, setExpiresAt] = useState(props.expiresAt ?? "");
  const [isActive, setIsActive] = useState(props.isActive);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(
    null
  );

  async function patch(body: Record<string, unknown>, okText: string) {
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch(`/api/qrcodes/${props.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        setMsg({ kind: "err", text: data.error ?? "Update failed" });
        return;
      }
      setMsg({ kind: "ok", text: okText });
      router.refresh();
    } catch {
      setMsg({ kind: "err", text: "Network error" });
    } finally {
      setBusy(false);
    }
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    await patch(
      { name, destinationUrl, expiresAt: expiresAt || null },
      "Saved"
    );
  }

  async function toggleActive() {
    const next = !isActive;
    setIsActive(next);
    await patch({ isActive: next }, next ? "Re-enabled" : "Disabled");
  }

  async function remove() {
    if (!confirm("Delete this QR code and all of its scan data? This cannot be undone.")) {
      return;
    }
    setBusy(true);
    try {
      const res = await fetch(`/api/qrcodes/${props.id}`, { method: "DELETE" });
      if (res.ok) {
        router.push("/");
        router.refresh();
      } else {
        const data = await res.json();
        setMsg({ kind: "err", text: data.error ?? "Delete failed" });
        setBusy(false);
      }
    } catch {
      setMsg({ kind: "err", text: "Network error" });
      setBusy(false);
    }
  }

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
      <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-zinc-500">
        Settings
      </h2>

      <form onSubmit={save} className="space-y-3">
        <div>
          <label className="block text-xs font-medium text-zinc-400">Name</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="mt-1 w-full rounded-md border border-zinc-700 bg-zinc-900 px-3 py-1.5 text-sm text-zinc-100 focus:border-blue-500 focus:outline-none"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-zinc-400">
            Destination URL
          </label>
          <input
            value={destinationUrl}
            onChange={(e) => setDestinationUrl(e.target.value)}
            className="mt-1 w-full rounded-md border border-zinc-700 bg-zinc-900 px-3 py-1.5 text-sm text-zinc-100 focus:border-blue-500 focus:outline-none"
          />
          <p className="mt-1 text-xs text-zinc-500">
            The QR image stays the same — only where it points changes.
          </p>
        </div>
        <div>
          <label className="block text-xs font-medium text-zinc-400">
            Expiry date
          </label>
          <input
            type="date"
            value={expiresAt}
            onChange={(e) => setExpiresAt(e.target.value)}
            className="mt-1 w-full rounded-md border border-zinc-700 bg-zinc-900 px-3 py-1.5 text-sm text-zinc-100 focus:border-blue-500 focus:outline-none"
          />
        </div>

        <button
          type="submit"
          disabled={busy}
          className="w-full rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-500 disabled:opacity-50"
        >
          Save changes
        </button>
      </form>

      {msg && (
        <div
          className={`mt-3 rounded-md px-3 py-1.5 text-xs ${
            msg.kind === "ok"
              ? "bg-emerald-950 text-emerald-400"
              : "bg-red-950 text-red-300"
          }`}
        >
          {msg.text}
        </div>
      )}

      <div className="mt-5 flex items-center justify-between border-t border-zinc-800 pt-4">
        <button
          onClick={toggleActive}
          disabled={busy}
          className="rounded-md border border-zinc-700 bg-zinc-900 px-3 py-1.5 text-sm font-medium text-zinc-200 hover:bg-zinc-800 disabled:opacity-50"
        >
          {isActive ? "Disable" : "Re-enable"}
        </button>
        <button
          onClick={remove}
          disabled={busy}
          className="rounded-md border border-red-900 bg-zinc-900 px-3 py-1.5 text-sm font-medium text-red-400 hover:bg-red-950/50 disabled:opacity-50"
        >
          Delete
        </button>
      </div>
    </div>
  );
}
