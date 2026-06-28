"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type FolderOption = { id: string; name: string };

/** Kebab menu on a tracker card: move to a folder, or delete. */
export default function TrackerMenu({
  trackerId,
  currentGroupId,
  folders,
}: {
  trackerId: string;
  currentGroupId: string | null;
  folders: FolderOption[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  async function move(groupId: string | null) {
    setBusy(true);
    try {
      await fetch(`/api/qrcodes/${trackerId}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ groupId }),
      });
      setOpen(false);
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!confirm("Delete this tracker and all of its scan data?")) return;
    setBusy(true);
    try {
      await fetch(`/api/qrcodes/${trackerId}`, { method: "DELETE" });
      setOpen(false);
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="relative">
      <button
        onClick={(e) => {
          e.preventDefault();
          setOpen((v) => !v);
        }}
        className="grid h-7 w-7 place-items-center rounded-md text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100"
        aria-label="Tracker actions"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
          <circle cx="12" cy="5" r="1.6" />
          <circle cx="12" cy="12" r="1.6" />
          <circle cx="12" cy="19" r="1.6" />
        </svg>
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 z-20 mt-1 w-52 rounded-lg border border-zinc-700 bg-zinc-900 p-1 shadow-xl">
            <div className="px-2 py-1 text-xs font-medium uppercase tracking-wide text-zinc-500">
              Move to
            </div>
            <button
              disabled={busy || currentGroupId === null}
              onClick={() => move(null)}
              className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm text-zinc-200 hover:bg-zinc-800 disabled:opacity-40"
            >
              Root (no folder)
            </button>
            {folders.map((f) => (
              <button
                key={f.id}
                disabled={busy || currentGroupId === f.id}
                onClick={() => move(f.id)}
                className="flex w-full items-center gap-2 truncate rounded-md px-2 py-1.5 text-left text-sm text-zinc-200 hover:bg-zinc-800 disabled:opacity-40"
              >
                {f.name}
              </button>
            ))}
            <div className="my-1 border-t border-zinc-800" />
            <button
              disabled={busy}
              onClick={remove}
              className="w-full rounded-md px-2 py-1.5 text-left text-sm text-red-400 hover:bg-red-950/50 disabled:opacity-40"
            >
              Delete tracker
            </button>
          </div>
        </>
      )}
    </div>
  );
}
