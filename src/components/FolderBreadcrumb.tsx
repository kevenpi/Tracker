"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";

// Must match the MIME used by DriveBoard's drag sources.
const MIME = "application/x-drive-item";

type Crumb = { id: string; name: string };

/**
 * Breadcrumb whose ancestor links are drop targets — drag a tracker or folder
 * onto "My Trackers" (or any parent folder) to move it there, just like Drive.
 */
export default function FolderBreadcrumb({
  ancestors,
  current,
}: {
  ancestors: Crumb[];
  current: Crumb;
}) {
  const router = useRouter();
  const [over, setOver] = useState<string | null>(null); // crumb key being hovered

  async function dropOn(targetId: string | null, e: React.DragEvent) {
    e.preventDefault();
    setOver(null);
    let p: { type: "tracker" | "folder"; id: string } | null = null;
    try {
      p = JSON.parse(e.dataTransfer.getData(MIME));
    } catch {
      return;
    }
    if (!p) return;
    if (p.type === "folder" && p.id === targetId) return;

    if (p.type === "tracker") {
      await fetch(`/api/qrcodes/${p.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ groupId: targetId }),
      });
    } else {
      const res = await fetch(`/api/groups/${p.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ parentId: targetId }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        alert(d.error || "Couldn't move that there.");
        return;
      }
    }
    router.refresh();
  }

  function DropLink({
    id,
    name,
    href,
  }: {
    id: string | null;
    name: string;
    href: string;
  }) {
    const key = id ?? "__root__";
    return (
      <Link
        href={href}
        onDragOver={(e) => {
          e.preventDefault();
          setOver(key);
        }}
        onDragLeave={() => setOver((o) => (o === key ? null : o))}
        onDrop={(e) => dropOn(id, e)}
        className={`rounded px-1 transition hover:text-zinc-300 ${
          over === key
            ? "bg-blue-950/50 text-blue-300 ring-1 ring-blue-500"
            : ""
        }`}
      >
        {name}
      </Link>
    );
  }

  return (
    <nav className="flex flex-wrap items-center gap-1 text-sm text-zinc-500">
      <DropLink id={null} name="My Trackers" href="/" />
      {ancestors.map((a) => (
        <span key={a.id} className="flex items-center gap-1">
          <span>/</span>
          <DropLink id={a.id} name={a.name} href={`/folder/${a.id}`} />
        </span>
      ))}
      <span>/</span>
      <span className="text-zinc-300">{current.name}</span>
    </nav>
  );
}
