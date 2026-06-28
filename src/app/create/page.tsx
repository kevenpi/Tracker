"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import QrDownload from "@/components/QrDownload";

type CreateResult = {
  qr: { id: string; slug: string; name: string; destinationUrl: string };
  shortUrl: string;
  pngDataUrl: string;
  svg: string;
};

type Folder = { id: string; name: string };

export default function CreatePage() {
  const [name, setName] = useState("");
  const [destinationUrl, setDestinationUrl] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [groupId, setGroupId] = useState("");
  const [folders, setFolders] = useState<Folder[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<CreateResult | null>(null);

  // Load folders and preselect one from ?folder=<id> (set by per-folder "New QR").
  useEffect(() => {
    const preselect = new URLSearchParams(window.location.search).get("folder");
    if (preselect) setGroupId(preselect);
    fetch("/api/groups")
      .then((r) => r.json())
      .then((d) => setFolders(d.groups ?? []))
      .catch(() => {});
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/qrcodes", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name,
          destinationUrl,
          expiresAt: expiresAt || null,
          groupId: groupId || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Something went wrong");
        return;
      }
      setResult(data as CreateResult);
    } catch {
      setError("Network error — please try again");
    } finally {
      setSubmitting(false);
    }
  }

  function reset() {
    setName("");
    setDestinationUrl("");
    setExpiresAt("");
    setResult(null);
    setError(null);
  }

  const inputClass =
    "mt-1 w-full rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 placeholder-zinc-500 focus:border-blue-500 focus:outline-none";

  if (result) {
    return (
      <div className="mx-auto max-w-lg">
        <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-6 text-center">
          <h1 className="text-xl font-semibold text-zinc-100">
            “{result.qr.name}” is ready
          </h1>
          <p className="mt-1 text-sm text-zinc-400">
            This QR encodes the short link below. Edit the destination later and
            the same code keeps working.
          </p>

          <div className="my-6 flex justify-center">
            <QrDownload
              pngDataUrl={result.pngDataUrl}
              svg={result.svg}
              filename={result.qr.slug}
            />
          </div>

          <div className="rounded-md border border-zinc-800 bg-zinc-950 p-3 text-left">
            <div className="text-xs uppercase tracking-wide text-zinc-500">
              Short link
            </div>
            <a
              href={result.shortUrl}
              target="_blank"
              rel="noreferrer"
              className="break-all font-mono text-sm text-blue-400 hover:underline"
            >
              {result.shortUrl}
            </a>
            <div className="mt-2 text-xs text-zinc-500">
              Destination: {result.qr.destinationUrl}
            </div>
          </div>

          <div className="mt-6 flex justify-center gap-3">
            <Link
              href={`/qr/${result.qr.id}`}
              className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500"
            >
              View analytics
            </Link>
            <button
              onClick={reset}
              className="rounded-md border border-zinc-700 bg-zinc-900 px-4 py-2 text-sm font-medium text-zinc-200 hover:bg-zinc-800"
            >
              Create another
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg">
      <h1 className="mb-1 text-2xl font-semibold text-zinc-100">New QR code</h1>
      <p className="mb-6 text-sm text-zinc-400">
        We generate a short tracking link and the QR image for it.
      </p>

      <form
        onSubmit={handleSubmit}
        className="space-y-4 rounded-xl border border-zinc-800 bg-zinc-900 p-6"
      >
        <div>
          <label className="block text-sm font-medium text-zinc-300">
            Name / label
          </label>
          <input
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Spring flyer"
            className={inputClass}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-zinc-300">
            Destination URL
          </label>
          <input
            type="text"
            required
            value={destinationUrl}
            onChange={(e) => setDestinationUrl(e.target.value)}
            placeholder="example.com/landing"
            className={inputClass}
          />
          <p className="mt-1 text-xs text-zinc-500">
            https:// is added automatically if you omit it.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-zinc-300">
              Folder <span className="text-zinc-500">(optional)</span>
            </label>
            <select
              value={groupId}
              onChange={(e) => setGroupId(e.target.value)}
              className={inputClass}
            >
              <option value="">Root (no folder)</option>
              {folders.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-300">
              Expiry date <span className="text-zinc-500">(optional)</span>
            </label>
            <input
              type="date"
              value={expiresAt}
              onChange={(e) => setExpiresAt(e.target.value)}
              className={inputClass}
            />
          </div>
        </div>

        {error && (
          <div className="rounded-md bg-red-950 px-3 py-2 text-sm text-red-300">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500 disabled:opacity-50"
        >
          {submitting ? "Creating…" : "Create QR code"}
        </button>
      </form>
    </div>
  );
}
