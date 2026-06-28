import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "QR Tracker",
  description: "A Drive for trackable QR codes — folders, scans, and analytics.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-zinc-950">
        <header className="border-b border-zinc-800 bg-zinc-900/60 backdrop-blur">
          <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
            <Link href="/" className="flex items-center gap-2 text-lg font-semibold tracking-tight">
              <span className="grid h-7 w-7 place-items-center rounded-md bg-blue-600 text-sm font-bold text-white">
                QR
              </span>
              <span className="text-zinc-100">Tracker</span>
            </Link>
            <nav className="flex items-center gap-4 text-sm">
              <Link href="/" className="text-zinc-400 hover:text-zinc-100">
                My Trackers
              </Link>
              <Link
                href="/create"
                className="rounded-md bg-blue-600 px-3 py-1.5 font-medium text-white hover:bg-blue-500"
              >
                New QR code
              </Link>
            </nav>
          </div>
        </header>
        <main className="mx-auto max-w-6xl px-4 py-8">{children}</main>
      </body>
    </html>
  );
}
