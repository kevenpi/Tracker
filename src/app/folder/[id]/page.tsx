import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { shortUrl, qrPngDataUrl } from "@/lib/qr";
import Toolbar from "@/components/Toolbar";
import FolderActions from "@/components/FolderActions";
import DriveBoard, {
  type FolderItem,
  type TrackerItem,
} from "@/components/DriveBoard";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function FolderPage({
  params,
}: {
  params: { id: string };
}) {
  const [folder, allFolders] = await Promise.all([
    prisma.group.findUnique({
      where: { id: params.id },
      include: {
        children: {
          orderBy: { createdAt: "desc" },
          include: { _count: { select: { qrCodes: true, children: true } } },
        },
        qrCodes: {
          orderBy: { createdAt: "desc" },
          include: { _count: { select: { scans: true } } },
        },
      },
    }),
    prisma.group.findMany({ orderBy: { createdAt: "desc" } }),
  ]);

  if (!folder) notFound();

  // Walk up the parent chain to build the breadcrumb (root → … → here).
  const ancestors: { id: string; name: string }[] = [];
  let cursor: string | null = folder.parentId;
  let guard = 0;
  while (cursor) {
    const p: { id: string; name: string; parentId: string | null } | null =
      await prisma.group.findUnique({
        where: { id: cursor },
        select: { id: true, name: true, parentId: true },
      });
    if (!p) break;
    ancestors.unshift({ id: p.id, name: p.name });
    cursor = p.parentId;
    if (++guard > 100) break;
  }

  const thumbs = await Promise.all(
    folder.qrCodes.map((c) => qrPngDataUrl(shortUrl(c.slug)))
  );

  const folderItems: FolderItem[] = folder.children.map((f) => ({
    id: f.id,
    name: f.name,
    trackerCount: f._count.qrCodes,
    subfolderCount: f._count.children,
  }));

  const trackers: TrackerItem[] = folder.qrCodes.map((c, i) => ({
    id: c.id,
    slug: c.slug,
    name: c.name,
    destinationUrl: c.destinationUrl,
    isActive: c.isActive,
    expiresAt: c.expiresAt ? c.expiresAt.toISOString() : null,
    groupId: c.groupId,
    scans: c._count.scans,
    thumb: thumbs[i],
  }));

  const allFolderOptions = allFolders.map((f) => ({ id: f.id, name: f.name }));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <nav className="flex flex-wrap items-center gap-1 text-sm text-zinc-500">
            <Link href="/" className="hover:text-zinc-300">
              My Trackers
            </Link>
            {ancestors.map((a) => (
              <span key={a.id} className="flex items-center gap-1">
                <span>/</span>
                <Link href={`/folder/${a.id}`} className="hover:text-zinc-300">
                  {a.name}
                </Link>
              </span>
            ))}
            <span>/</span>
            <span className="text-zinc-300">{folder.name}</span>
          </nav>
          <h1 className="mt-1 text-2xl font-semibold text-zinc-100">
            {folder.name}
          </h1>
          <p className="text-sm text-zinc-500">
            {folder.children.length} folder
            {folder.children.length === 1 ? "" : "s"} ·{" "}
            {folder.qrCodes.length} tracker
            {folder.qrCodes.length === 1 ? "" : "s"}
          </p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <Toolbar currentGroupId={folder.id} />
          <FolderActions groupId={folder.id} name={folder.name} />
        </div>
      </div>

      <DriveBoard
        folders={folderItems}
        trackers={trackers}
        allFolders={allFolderOptions}
        currentGroupId={folder.id}
      />
    </div>
  );
}
