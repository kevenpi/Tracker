"use client";

import { useState } from "react";

type ImportResult = {
  created: number;
  skipped: number;
  foldersCreated: string[];
};

export default function ImportDialog({
  currentGroupId,
  onClose,
  onDone,
}: {
  currentGroupId: string | null;
  onClose: () => void;
  onDone: () => void;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ImportResult | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!file) return;
    setBusy(true);
    setError(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      if (currentGroupId) fd.append("group_id", currentGroupId);
      const res = await fetch("/api/qrcodes/import", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Import failed");
        return;
      }
      setResult(data as ImportResult);
    } catch {
      setError("Network error — please try again");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-xl border border-zinc-800 bg-zinc-900 p-6"
        onClick={(e) => e.stopPropagation()}
      >
        {result ? (
          <>
            <h2 className="text-lg font-semibold text-zinc-100">Import complete</h2>
            <ul className="mt-3 space-y-1 text-sm text-zinc-300">
              <li>
                <span className="font-semibold text-emerald-400">{result.created}</span>{" "}
                tracker{result.created === 1 ? "" : "s"} created
              </li>
              {result.skipped > 0 && (
                <li>
                  <span className="font-semibold text-amber-400">{result.skipped}</span>{" "}
                  row{result.skipped === 1 ? "" : "s"} skipped (missing name/URL)
                </li>
              )}
              {result.foldersCreated.length > 0 && (
                <li className="text-zinc-400">
                  New folders: {result.foldersCreated.join(", ")}
                </li>
              )}
            </ul>
            <button
              onClick={onDone}
              className="mt-5 w-full rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500"
            >
              Done
            </button>
          </>
        ) : (
          <form onSubmit={submit}>
            <h2 className="text-lg font-semibold text-zinc-100">Import trackers from CSV</h2>
            <p className="mt-1 text-sm text-zinc-400">
              Columns: <code className="text-zinc-300">name</code>,{" "}
              <code className="text-zinc-300">destination_url</code> (required),{" "}
              <code className="text-zinc-300">folder</code>,{" "}
              <code className="text-zinc-300">expires_at</code> (optional). A{" "}
              <code className="text-zinc-300">folder</code> value creates that
              folder if it doesn&apos;t exist.
            </p>

            <input
              type="file"
              accept=".csv,text/csv"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              className="mt-4 block w-full text-sm text-zinc-300 file:mr-3 file:rounded-md file:border-0 file:bg-zinc-800 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-zinc-100 hover:file:bg-zinc-700"
            />

            {error && (
              <div className="mt-3 rounded-md bg-red-950 px-3 py-2 text-sm text-red-300">
                {error}
              </div>
            )}

            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={onClose}
                className="rounded-md border border-zinc-700 px-4 py-2 text-sm text-zinc-300 hover:bg-zinc-800"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!file || busy}
                className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500 disabled:opacity-50"
              >
                {busy ? "Importing…" : "Import"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
