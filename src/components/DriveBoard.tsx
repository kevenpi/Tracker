"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import TrackerMenu from "./TrackerMenu";

export type FolderItem = {
  id: string;
  name: string;
  trackerCount: number;
  subfolderCount: number;
};

export type TrackerItem = {
  id: string;
  slug: string;
  name: string;
  destinationUrl: string;
  isActive: boolean;
  expiresAt: string | null; // ISO string (server components can't pass Date to client)
  groupId: string | null;
  scans: number;
  thumb: string; // QR PNG data URL
};

type DragPayload = { type: "tracker" | "folder"; id: string };
const MIME = "application/x-drive-item";

/**
 * Google-Drive-style board. Trackers and folders are draggable; folders (and
 * the "top level" strip) are drop targets. Dropping a tracker on a folder moves
 * it there; dropping a folder on a folder nests it. All moves hit the API then
 * refresh the route.
 */
export default function DriveBoard({
  folders,
  trackers,
  allFolders,
  currentGroupId,
}: {
  folders: FolderItem[];
  trackers: TrackerItem[];
  allFolders: { id: string; name: string }[];
  /** The folder being viewed (null at root) — used by the "top level" target. */
  currentGroupId: string | null;
}) {
  const router = useRouter();
  const [dragging, setDragging] = useState<DragPayload | null>(null);
  const [over, setOver] = useState<string | null>(null); // folderId or "__root__"
  const [busy, setBusy] = useState(false);

  function startDrag(e: React.DragEvent, payload: DragPayload) {
    e.dataTransfer.setData(MIME, JSON.stringify(payload));
    e.dataTransfer.effectAllowed = "move";
    setDragging(payload);
  }

  function readPayload(e: React.DragEvent): DragPayload | null {
    try {
      return JSON.parse(e.dataTransfer.getData(MIME)) as DragPayload;
    } catch {
      return dragging;
    }
  }

  // targetFolderId === null means "move to top level (root)".
  async function moveTo(targetFolderId: string | null, e: React.DragEvent) {
    e.preventDefault();
    setOver(null);
    const payload = readPayload(e);
    setDragging(null);
    if (!payload) return;
    // Dropping a folder onto itself is a no-op.
    if (payload.type === "folder" && payload.id === targetFolderId) return;

    setBusy(true);
    try {
      if (payload.type === "tracker") {
        await fetch(`/api/qrcodes/${payload.id}`, {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ groupId: targetFolderId }),
        });
      } else {
        await fetch(`/api/groups/${payload.id}`, {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ parentId: targetFolderId }),
        });
      }
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  const showRootTarget = dragging !== null && currentGroupId !== null;

  return (
    <div className={busy ? "pointer-events-none opacity-60" : undefined}>
      {/* Drop-to-top-level strip, only while dragging inside a subfolder */}
      {showRootTarget && (
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setOver("__root__");
          }}
          onDragLeave={() => setOver(null)}
          onDrop={(e) => moveTo(null, e)}
          className={`mb-4 rounded-lg border border-dashed p-3 text-center text-sm transition ${
            over === "__root__"
              ? "border-blue-500 bg-blue-950/40 text-blue-300"
              : "border-zinc-700 text-zinc-500"
          }`}
        >
          ⤴ Drop here to move to the top level
        </div>
      )}

      {/* Folders */}
      {folders.length > 0 && (
        <section className="mb-8">
          <h2 className="mb-3 text-xs font-medium uppercase tracking-wide text-zinc-500">
            Folders
          </h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {folders.map((f) => {
              const isOver = over === f.id;
              const isSelf = dragging?.type === "folder" && dragging.id === f.id;
              return (
                <div
                  key={f.id}
                  draggable
                  onDragStart={(e) => startDrag(e, { type: "folder", id: f.id })}
                  onDragEnd={() => {
                    setDragging(null);
                    setOver(null);
                  }}
                  onDragOver={(e) => {
                    if (isSelf) return;
                    e.preventDefault();
                    setOver(f.id);
                  }}
                  onDragLeave={() => setOver((o) => (o === f.id ? null : o))}
                  onDrop={(e) => moveTo(f.id, e)}
                  className={`flex items-center gap-3 rounded-xl border bg-zinc-900 p-3 transition ${
                    isOver
                      ? "border-blue-500 bg-blue-950/30 ring-1 ring-blue-500"
                      : "border-zinc-800 hover:border-zinc-700 hover:bg-zinc-800/60"
                  } ${isSelf ? "opacity-40" : ""}`}
                >
                  <Link
                    href={`/folder/${f.id}`}
                    className="flex min-w-0 flex-1 items-center gap-3"
                  >
                    <FolderIcon />
                    <div className="min-w-0">
                      <div className="truncate font-medium text-zinc-100">
                        {f.name}
                      </div>
                      <div className="text-xs text-zinc-500">
                        {f.trackerCount} tracker
                        {f.trackerCount === 1 ? "" : "s"}
                        {f.subfolderCount > 0 &&
                          ` · ${f.subfolderCount} folder${
                            f.subfolderCount === 1 ? "" : "s"
                          }`}
                      </div>
                    </div>
                  </Link>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Trackers */}
      <section>
        <h2 className="mb-3 text-xs font-medium uppercase tracking-wide text-zinc-500">
          Trackers
        </h2>
        {trackers.length === 0 ? (
          <div className="rounded-xl border border-dashed border-zinc-800 bg-zinc-900/40 p-12 text-center">
            <p className="text-zinc-400">
              {folders.length > 0
                ? "No trackers here — drag one in, or create one."
                : "No trackers yet."}
            </p>
            <Link
              href={
                currentGroupId ? `/create?folder=${currentGroupId}` : "/create"
              }
              className="mt-3 inline-block rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500"
            >
              Create a QR code
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {trackers.map((c) => {
              const expired =
                c.expiresAt != null && new Date(c.expiresAt).getTime() < Date.now();
              const isSelf =
                dragging?.type === "tracker" && dragging.id === c.id;
              return (
                <div
                  key={c.id}
                  draggable
                  onDragStart={(e) =>
                    startDrag(e, { type: "tracker", id: c.id })
                  }
                  onDragEnd={() => {
                    setDragging(null);
                    setOver(null);
                  }}
                  className={`group relative flex gap-3 rounded-xl border border-zinc-800 bg-zinc-900 p-3 transition hover:border-zinc-700 ${
                    isSelf ? "opacity-40" : ""
                  }`}
                >
                  <Link href={`/qr/${c.id}`} className="shrink-0">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={c.thumb}
                      alt={`QR for ${c.name}`}
                      className="h-16 w-16 rounded-md border border-zinc-800 bg-white"
                      draggable={false}
                    />
                  </Link>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <Link
                        href={`/qr/${c.id}`}
                        className="truncate font-medium text-zinc-100 hover:text-blue-400"
                      >
                        {c.name}
                      </Link>
                      <TrackerMenu
                        trackerId={c.id}
                        currentGroupId={c.groupId}
                        folders={allFolders}
                      />
                    </div>
                    <div className="truncate text-xs text-zinc-500">
                      {c.destinationUrl}
                    </div>
                    <div className="mt-2 flex items-center gap-2 text-xs">
                      <span className="font-semibold tabular-nums text-zinc-200">
                        {c.scans}
                      </span>
                      <span className="text-zinc-500">
                        scan{c.scans === 1 ? "" : "s"}
                      </span>
                      <span className="text-zinc-700">·</span>
                      {!c.isActive ? (
                        <span className="rounded-full bg-zinc-800 px-2 py-0.5 text-zinc-400">
                          Disabled
                        </span>
                      ) : expired ? (
                        <span className="rounded-full bg-amber-950 px-2 py-0.5 text-amber-400">
                          Expired
                        </span>
                      ) : (
                        <span className="rounded-full bg-emerald-950 px-2 py-0.5 text-emerald-400">
                          Active
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}

function FolderIcon() {
  return (
    <svg
      width="36"
      height="36"
      viewBox="0 0 24 24"
      fill="none"
      className="shrink-0 text-blue-500"
    >
      <path
        d="M4 20h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.93a2 2 0 0 1-1.66-.9l-.82-1.2A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13c0 1.1.9 2 2 2Z"
        fill="currentColor"
        fillOpacity="0.18"
        stroke="currentColor"
        strokeWidth="1.5"
      />
    </svg>
  );
}
