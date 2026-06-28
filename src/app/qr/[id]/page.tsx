import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { shortUrl, qrPngDataUrl, qrSvgString } from "@/lib/qr";
import {
  countUniqueScans,
  pickGranularity,
  bucketScans,
  breakdown,
  geoBreakdown,
} from "@/lib/analytics";
import QrDownload from "@/components/QrDownload";
import QrSettings from "@/components/QrSettings";
import { ScansLineChart, BreakdownPieChart } from "@/components/charts";
import ScanMap from "@/components/ScanMap";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const PAGE_SIZE = 25;

function fmtDateTime(d: Date): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
}

function toDateInput(d: Date | null): string | null {
  if (!d) return null;
  return d.toISOString().slice(0, 10);
}

export default async function AnalyticsPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams?: { page?: string };
}) {
  const qr = await prisma.qrCode.findUnique({
    where: { id: params.id },
    include: {
      group: true,
      scans: { orderBy: { scannedAt: "desc" } },
    },
  });

  if (!qr) notFound();

  const scans = qr.scans;
  const total = scans.length;
  const windowMinutes = Number(process.env.UNIQUE_SCAN_WINDOW_MINUTES ?? 30);
  const unique = countUniqueScans(scans, windowMinutes);

  const granularity = pickGranularity(scans);
  const series = bucketScans(scans, granularity);

  const devices = breakdown(scans, "deviceType");
  const browsers = breakdown(scans, "browser");
  const oses = breakdown(scans, "os");
  const geo = geoBreakdown(scans);

  const link = shortUrl(qr.slug);
  const [pngDataUrl, svg] = await Promise.all([
    qrPngDataUrl(link),
    qrSvgString(link),
  ]);

  const page = Math.max(1, Number(searchParams?.page ?? 1) || 1);
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const safePage = Math.min(page, pageCount);
  const pageScans = scans.slice(
    (safePage - 1) * PAGE_SIZE,
    safePage * PAGE_SIZE
  );

  const expired = qr.expiresAt != null && qr.expiresAt.getTime() < Date.now();

  return (
    <div className="space-y-6">
      <div>
        <nav className="flex items-center gap-1 text-sm text-zinc-500">
          <Link href="/" className="hover:text-zinc-300">
            My Trackers
          </Link>
          {qr.group && (
            <>
              <span>/</span>
              <Link
                href={`/folder/${qr.group.id}`}
                className="hover:text-zinc-300"
              >
                {qr.group.name}
              </Link>
            </>
          )}
          <span>/</span>
          <span className="text-zinc-300">{qr.name}</span>
        </nav>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-semibold text-zinc-100">{qr.name}</h1>
          {!qr.isActive ? (
            <span className="rounded-full bg-zinc-800 px-2 py-0.5 text-xs font-medium text-zinc-400">
              Disabled
            </span>
          ) : expired ? (
            <span className="rounded-full bg-amber-950 px-2 py-0.5 text-xs font-medium text-amber-400">
              Expired
            </span>
          ) : (
            <span className="rounded-full bg-emerald-950 px-2 py-0.5 text-xs font-medium text-emerald-400">
              Active
            </span>
          )}
        </div>
        <a
          href={qr.destinationUrl}
          target="_blank"
          rel="noreferrer"
          className="text-sm text-blue-400 hover:underline"
        >
          {qr.destinationUrl}
        </a>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Left column: QR + settings */}
        <div className="space-y-6">
          <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5 text-center">
            <QrDownload pngDataUrl={pngDataUrl} svg={svg} filename={qr.slug} />
            <a
              href={link}
              target="_blank"
              rel="noreferrer"
              className="mt-3 block break-all font-mono text-xs text-zinc-500 hover:text-blue-400"
            >
              {link}
            </a>
          </div>

          <QrSettings
            id={qr.id}
            name={qr.name}
            destinationUrl={qr.destinationUrl}
            isActive={qr.isActive}
            expiresAt={toDateInput(qr.expiresAt)}
          />
        </div>

        {/* Right column: analytics */}
        <div className="space-y-6 lg:col-span-2">
          <div className="grid grid-cols-2 gap-4">
            <StatCard label="Total scans" value={total} />
            <StatCard
              label="Unique scans"
              value={unique}
              hint={`by IP, ${windowMinutes}-min window`}
            />
          </div>

          <Panel title={`Scans over time (by ${granularity})`}>
            <ScansLineChart data={series} />
          </Panel>

          <Panel title="Scan locations">
            <p className="mb-3 text-xs text-zinc-500">
              IP-based location is city-level approximate, not GPS.
            </p>
            <ScanMap
              locations={geo.map((g) => ({
                city: g.city,
                region: g.region,
                country: g.country,
                count: g.count,
                lat: g.lat,
                lng: g.lng,
              }))}
            />
          </Panel>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <Panel title="Devices">
              <BreakdownPieChart data={devices} />
            </Panel>
            <Panel title="Browsers">
              <BreakdownPieChart data={browsers} />
            </Panel>
          </div>

          <Panel title="Operating systems">
            <BreakdownPieChart data={oses} />
          </Panel>

          <Panel title="Geography">
            {geo.length === 0 ? (
              <p className="text-sm text-zinc-500">No scans yet.</p>
            ) : (
              <table className="w-full text-sm">
                <thead className="border-b border-zinc-800 text-left text-xs uppercase tracking-wide text-zinc-500">
                  <tr>
                    <th className="py-2 font-medium">Country</th>
                    <th className="py-2 font-medium">Region</th>
                    <th className="py-2 font-medium">City</th>
                    <th className="py-2 text-right font-medium">Scans</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/70">
                  {geo.map((g, i) => (
                    <tr key={i}>
                      <td className="py-2 text-zinc-200">{g.country}</td>
                      <td className="py-2 text-zinc-500">{g.region ?? "—"}</td>
                      <td className="py-2 text-zinc-500">{g.city ?? "—"}</td>
                      <td className="py-2 text-right font-semibold tabular-nums text-zinc-200">
                        {g.count}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </Panel>

          <Panel title="Raw scan log">
            {total === 0 ? (
              <p className="text-sm text-zinc-500">No scans yet.</p>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="border-b border-zinc-800 text-left text-xs uppercase tracking-wide text-zinc-500">
                      <tr>
                        <th className="py-2 font-medium">Time</th>
                        <th className="py-2 font-medium">Location</th>
                        <th className="py-2 font-medium">Time zone</th>
                        <th className="py-2 font-medium">Device</th>
                        <th className="py-2 font-medium">OS / Browser</th>
                        <th className="py-2 font-medium">IP</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-800/70">
                      {pageScans.map((s) => (
                        <tr key={s.id}>
                          <td className="whitespace-nowrap py-2 text-zinc-300">
                            {fmtDateTime(s.scannedAt)}
                          </td>
                          <td className="py-2 text-zinc-500">
                            {[s.city, s.region, s.country]
                              .filter(Boolean)
                              .join(", ") || "—"}
                          </td>
                          <td className="py-2 font-mono text-xs text-zinc-500">
                            {s.timezone ?? "—"}
                          </td>
                          <td className="py-2 text-zinc-500">
                            {s.deviceType ?? "—"}
                          </td>
                          <td className="py-2 text-zinc-500">
                            {[s.os, s.browser].filter(Boolean).join(" · ") ||
                              "—"}
                          </td>
                          <td className="py-2 font-mono text-xs text-zinc-600">
                            {s.ipAddress ?? "—"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {pageCount > 1 && (
                  <div className="mt-4 flex items-center justify-between text-sm">
                    <span className="text-zinc-500">
                      Page {safePage} of {pageCount}
                    </span>
                    <div className="flex gap-2">
                      <PageLink
                        id={qr.id}
                        page={safePage - 1}
                        disabled={safePage <= 1}
                        label="Previous"
                      />
                      <PageLink
                        id={qr.id}
                        page={safePage + 1}
                        disabled={safePage >= pageCount}
                        label="Next"
                      />
                    </div>
                  </div>
                )}
              </>
            )}
          </Panel>
        </div>
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: number;
  hint?: string;
}) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
      <div className="text-xs uppercase tracking-wide text-zinc-500">
        {label}
      </div>
      <div className="mt-1 text-3xl font-semibold tabular-nums text-zinc-100">
        {value}
      </div>
      {hint && <div className="mt-1 text-xs text-zinc-600">{hint}</div>}
    </div>
  );
}

function Panel({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-zinc-500">
        {title}
      </h2>
      {children}
    </div>
  );
}

function PageLink({
  id,
  page,
  disabled,
  label,
}: {
  id: string;
  page: number;
  disabled: boolean;
  label: string;
}) {
  if (disabled) {
    return (
      <span className="cursor-not-allowed rounded-md border border-zinc-800 px-3 py-1 text-zinc-700">
        {label}
      </span>
    );
  }
  return (
    <Link
      href={`/qr/${id}?page=${page}`}
      className="rounded-md border border-zinc-700 px-3 py-1 text-zinc-200 hover:bg-zinc-800"
    >
      {label}
    </Link>
  );
}
