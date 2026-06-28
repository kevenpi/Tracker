import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import Toolbar from "@/components/Toolbar";
import TrackerGrid from "@/components/TrackerGrid";
import FolderActions from "@/components/FolderActions";

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
        qrCodes: {
          orderBy: { createdAt: "desc" },
          include: { _count: { select: { scans: true } } },
        },
      },
    }),
    prisma.group.findMany({ orderBy: { createdAt: "desc" } }),
  ]);

  if (!folder) notFound();

  const folderOptions = allFolders.map((f) => ({ id: f.id, name: f.name }));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <nav className="flex items-center gap-1 text-sm text-zinc-500">
            <Link href="/" className="hover:text-zinc-300">
              My Trackers
            </Link>
            <span>/</span>
            <span className="text-zinc-300">{folder.name}</span>
          </nav>
          <h1 className="mt-1 text-2xl font-semibold text-zinc-100">
            {folder.name}
          </h1>
          <p className="text-sm text-zinc-500">
            {folder.qrCodes.length} tracker
            {folder.qrCodes.length === 1 ? "" : "s"}
          </p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <Toolbar currentGroupId={folder.id} />
          <FolderActions groupId={folder.id} name={folder.name} />
        </div>
      </div>

      {folder.qrCodes.length === 0 ? (
        <div className="rounded-xl border border-dashed border-zinc-800 bg-zinc-900/40 p-12 text-center">
          <p className="text-zinc-400">This folder is empty.</p>
          <p className="mt-1 text-sm text-zinc-500">
            Use <span className="text-zinc-300">New QR</span> or{" "}
            <span className="text-zinc-300">Import CSV</span> above to add
            trackers here.
          </p>
        </div>
      ) : (
        <TrackerGrid codes={folder.qrCodes} folders={folderOptions} />
      )}
    </div>
  );
}
