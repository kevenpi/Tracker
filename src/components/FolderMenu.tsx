"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type FolderOption = { id: string; name: string };

/**
 * Kebab (⋮) menu on a folder card — the Google-Drive overflow menu.
 * Rename, Move to (another folder or the top level), or Delete.
 */
export default function FolderMenu({
  folderId,
  name,
  folders,
}: {
  folderId: string;
  name: string;
  folders: FolderOption[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [view, setView] = useState<"menu" | "rename" | "move">("menu");
  const [value, setValue] = useState(name);

  function close() {
    setOpen(false);
    setView("menu");
    setValue(name);
  }

  async function rename(e: React.FormEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (!value.trim()) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/groups/${folderId}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name: value }),
      });
      if (res.ok) {
        close();
        router.refresh();
      }
    } finally {
      setBusy(false);
    }
  }

  async function move(parentId: string | null) {
    setBusy(true);
    try {
      const res = await fetch(`/api/groups/${folderId}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ parentId }),
      });
      if (res.ok) {
        close();
        router.refresh();
      } else {
        const d = await res.json().catch(() => ({}));
        alert(d.error || "Couldn't move that folder.");
      }
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (
      !confirm(
        `Delete folder “${name}”? Trackers and any subfolders inside it are kept and moved back to the top level.`
      )
    )
      return;
    setBusy(true);
    try {
      const res = await fetch(`/api/groups/${folderId}`, { method: "DELETE" });
      if (res.ok) {
        close();
        router.refresh();
      }
    } finally {
      setBusy(false);
    }
  }

  const stop = (e: React.SyntheticEvent) => e.stopPropagation();

  return (
    // preventDefault stops the parent card's <Link> from navigating on click.
    <div
      className="relative shrink-0"
      onClick={(e) => e.preventDefault()}
      draggable
      onDragStart={(e) => e.preventDefault()}
    >
      <button
        type="button"
        aria-label="Folder actions"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setOpen((v) => !v);
        }}
        className="grid h-7 w-7 place-items-center rounded-md text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
          <circle cx="12" cy="5" r="1.6" />
          <circle cx="12" cy="12" r="1.6" />
          <circle cx="12" cy="19" r="1.6" />
        </svg>
      </button>

      {open && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={(e) => {
              e.preventDefault();
              close();
            }}
          />
          <div
            className="absolute right-0 z-20 mt-1 w-56 rounded-lg border border-zinc-700 bg-zinc-900 p-1 shadow-xl"
            onClick={stop}
          >
            {view === "rename" ? (
              <form onSubmit={rename} className="p-1">
                <input
                  autoFocus
                  value={value}
                  onClick={stop}
                  onChange={(e) => setValue(e.target.value)}
                  className="w-full rounded-md border border-zinc-700 bg-zinc-950 px-2 py-1.5 text-sm text-zinc-100 focus:border-blue-500 focus:outline-none"
                />
                <div className="mt-2 flex gap-2">
                  <button
                    type="submit"
                    disabled={busy}
                    className="flex-1 rounded-md bg-blue-600 px-2 py-1.5 text-sm font-medium text-white hover:bg-blue-500 disabled:opacity-50"
                  >
                    Save
                  </button>
                  <button
                    type="button"
                    onClick={() => setView("menu")}
                    className="rounded-md border border-zinc-700 px-2 py-1.5 text-sm text-zinc-300 hover:bg-zinc-800"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            ) : view === "move" ? (
              <>
                <div className="flex items-center justify-between px-2 py-1 text-xs font-medium uppercase tracking-wide text-zinc-500">
                  <span>Move to</span>
                  <button
                    onClick={() => setView("menu")}
                    className="text-zinc-400 hover:text-zinc-200"
                  >
                    ← Back
                  </button>
                </div>
                <button
                  disabled={busy}
                  onClick={() => move(null)}
                  className="w-full rounded-md px-2 py-1.5 text-left text-sm text-zinc-200 hover:bg-zinc-800 disabled:opacity-40"
                >
                  Top level (home)
                </button>
                <div className="max-h-56 overflow-y-auto">
                  {folders
                    .filter((f) => f.id !== folderId)
                    .map((f) => (
                      <button
                        key={f.id}
                        disabled={busy}
                        onClick={() => move(f.id)}
                        className="block w-full truncate rounded-md px-2 py-1.5 text-left text-sm text-zinc-200 hover:bg-zinc-800 disabled:opacity-40"
                      >
                        {f.name}
                      </button>
                    ))}
                </div>
              </>
            ) : (
              <>
                <button
                  onClick={() => setView("rename")}
                  className="w-full rounded-md px-2 py-1.5 text-left text-sm text-zinc-200 hover:bg-zinc-800"
                >
                  Rename
                </button>
                <button
                  onClick={() => setView("move")}
                  className="w-full rounded-md px-2 py-1.5 text-left text-sm text-zinc-200 hover:bg-zinc-800"
                >
                  Move to…
                </button>
                <div className="my-1 border-t border-zinc-800" />
                <button
                  disabled={busy}
                  onClick={remove}
                  className="w-full rounded-md px-2 py-1.5 text-left text-sm text-red-400 hover:bg-red-950/50 disabled:opacity-40"
                >
                  Delete folder
                </button>
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
}
