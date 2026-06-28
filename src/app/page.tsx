import { prisma } from "@/lib/prisma";
import { shortUrl, qrPngDataUrl } from "@/lib/qr";
import Toolbar from "@/components/Toolbar";
import DriveBoard, {
  type FolderItem,
  type TrackerItem,
} from "@/components/DriveBoard";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function DrivePage() {
  const [folders, looseCodes, allFolders] = await Promise.all([
    prisma.group.findMany({
      where: { parentId: null },
      orderBy: { createdAt: "desc" },
      include: { _count: { select: { qrCodes: true, children: true } } },
    }),
    prisma.qrCode.findMany({
      where: { groupId: null },
      orderBy: { createdAt: "desc" },
      include: { _count: { select: { scans: true } } },
    }),
    prisma.group.findMany({ orderBy: { createdAt: "desc" } }),
  ]);

  // QR thumbnails are generated server-side, then passed to the client board.
  const thumbs = await Promise.all(
    looseCodes.map((c) => qrPngDataUrl(shortUrl(c.slug)))
  );

  const folderItems: FolderItem[] = folders.map((f) => ({
    id: f.id,
    name: f.name,
    trackerCount: f._count.qrCodes,
    subfolderCount: f._count.children,
  }));

  const trackers: TrackerItem[] = looseCodes.map((c, i) => ({
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
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-100">My Trackers</h1>
          <p className="text-sm text-zinc-500">
            {folders.length} folder{folders.length === 1 ? "" : "s"} ·{" "}
            {looseCodes.length} loose tracker
            {looseCodes.length === 1 ? "" : "s"}
            <span className="ml-2 text-zinc-600">
              · drag trackers or folders to organize
            </span>
          </p>
        </div>
        <Toolbar currentGroupId={null} />
      </div>

      <DriveBoard
        folders={folderItems}
        trackers={trackers}
        allFolders={allFolderOptions}
        currentGroupId={null}
      />
    </div>
  );
}
