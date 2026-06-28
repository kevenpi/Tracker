import Link from "next/link";
import { prisma } from "@/lib/prisma";
import Toolbar from "@/components/Toolbar";
import TrackerGrid from "@/components/TrackerGrid";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function DrivePage() {
  const [folders, looseCodes] = await Promise.all([
    prisma.group.findMany({
      orderBy: { createdAt: "desc" },
      include: { _count: { select: { qrCodes: true } } },
    }),
    prisma.qrCode.findMany({
      where: { groupId: null },
      orderBy: { createdAt: "desc" },
      include: { _count: { select: { scans: true } } },
    }),
  ]);

  const folderOptions = folders.map((f) => ({ id: f.id, name: f.name }));

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-100">My Trackers</h1>
          <p className="text-sm text-zinc-500">
            {folders.length} folder{folders.length === 1 ? "" : "s"} ·{" "}
            {looseCodes.length} loose tracker
            {looseCodes.length === 1 ? "" : "s"}
          </p>
        </div>
        <Toolbar currentGroupId={null} />
      </div>

      {/* Folders */}
      {folders.length > 0 && (
        <section>
          <h2 className="mb-3 text-xs font-medium uppercase tracking-wide text-zinc-500">
            Folders
          </h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {folders.map((f) => (
              <Link
                key={f.id}
                href={`/folder/${f.id}`}
                className="flex items-center gap-3 rounded-xl border border-zinc-800 bg-zinc-900 p-3 transition hover:border-zinc-700 hover:bg-zinc-800/60"
              >
                <FolderIcon />
                <div className="min-w-0">
                  <div className="truncate font-medium text-zinc-100">
                    {f.name}
                  </div>
                  <div className="text-xs text-zinc-500">
                    {f._count.qrCodes} tracker
                    {f._count.qrCodes === 1 ? "" : "s"}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Loose trackers */}
      <section>
        <h2 className="mb-3 text-xs font-medium uppercase tracking-wide text-zinc-500">
          Trackers
        </h2>
        {looseCodes.length === 0 ? (
          <div className="rounded-xl border border-dashed border-zinc-800 bg-zinc-900/40 p-12 text-center">
            <p className="text-zinc-400">
              {folders.length > 0
                ? "No loose trackers — open a folder or create one."
                : "No trackers yet."}
            </p>
            <Link
              href="/create"
              className="mt-3 inline-block rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500"
            >
              Create your first QR code
            </Link>
          </div>
        ) : (
          <TrackerGrid codes={looseCodes} folders={folderOptions} />
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
