import Link from "next/link";
import { shortUrl, qrPngDataUrl } from "@/lib/qr";
import TrackerMenu from "./TrackerMenu";

export type TrackerCardData = {
  id: string;
  slug: string;
  name: string;
  destinationUrl: string;
  isActive: boolean;
  expiresAt: Date | null;
  groupId: string | null;
  createdAt: Date;
  _count: { scans: number };
};

type FolderOption = { id: string; name: string };

/** Grid of tracker "files". Server component — generates QR thumbnails inline. */
export default async function TrackerGrid({
  codes,
  folders,
}: {
  codes: TrackerCardData[];
  folders: FolderOption[];
}) {
  const thumbs = await Promise.all(
    codes.map((c) => qrPngDataUrl(shortUrl(c.slug)))
  );

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {codes.map((c, i) => {
        const expired =
          c.expiresAt != null && c.expiresAt.getTime() < Date.now();
        return (
          <div
            key={c.id}
            className="group relative flex gap-3 rounded-xl border border-zinc-800 bg-zinc-900 p-3 transition hover:border-zinc-700"
          >
            <Link href={`/qr/${c.id}`} className="shrink-0">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={thumbs[i]}
                alt={`QR for ${c.name}`}
                className="h-16 w-16 rounded-md border border-zinc-800 bg-white"
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
                  folders={folders}
                />
              </div>
              <div className="truncate text-xs text-zinc-500">
                {c.destinationUrl}
              </div>
              <div className="mt-2 flex items-center gap-2 text-xs">
                <span className="font-semibold tabular-nums text-zinc-200">
                  {c._count.scans}
                </span>
                <span className="text-zinc-500">
                  scan{c._count.scans === 1 ? "" : "s"}
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
  );
}
