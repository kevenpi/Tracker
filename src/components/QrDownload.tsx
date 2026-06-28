"use client";

/**
 * Renders a QR image and "Download PNG / SVG" buttons.
 * Both the PNG data URL and the raw SVG string are generated server-side and
 * passed in as props.
 */
export default function QrDownload({
  pngDataUrl,
  svg,
  filename,
  size = 220,
}: {
  pngDataUrl: string;
  svg: string;
  filename: string;
  size?: number;
}) {
  function downloadPng() {
    triggerDownload(pngDataUrl, `${filename}.png`);
  }

  function downloadSvg() {
    const blob = new Blob([svg], { type: "image/svg+xml" });
    const url = URL.createObjectURL(blob);
    triggerDownload(url, `${filename}.svg`);
    URL.revokeObjectURL(url);
  }

  return (
    <div className="flex flex-col items-center gap-3">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={pngDataUrl}
        alt="QR code"
        width={size}
        height={size}
        className="rounded-lg border border-zinc-700 bg-white p-2"
      />
      <div className="flex gap-2">
        <button
          onClick={downloadPng}
          className="rounded-md border border-zinc-700 bg-zinc-900 px-3 py-1.5 text-sm font-medium text-zinc-200 hover:bg-zinc-800"
        >
          Download PNG
        </button>
        <button
          onClick={downloadSvg}
          className="rounded-md border border-zinc-700 bg-zinc-900 px-3 py-1.5 text-sm font-medium text-zinc-200 hover:bg-zinc-800"
        >
          Download SVG
        </button>
      </div>
    </div>
  );
}

function triggerDownload(href: string, filename: string) {
  const a = document.createElement("a");
  a.href = href;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
}
