import QRCode from "qrcode";

/** Build the short tracking URL that gets encoded into the QR image. */
export function shortUrl(slug: string): string {
  const base = process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3000";
  return `${base.replace(/\/$/, "")}/r/${slug}`;
}

/** Render the QR as a PNG data URL (for <img> + PNG download). */
export function qrPngDataUrl(text: string): Promise<string> {
  return QRCode.toDataURL(text, {
    width: 512,
    margin: 2,
    errorCorrectionLevel: "M",
  });
}

/** Render the QR as an SVG string (for inline display + SVG download). */
export function qrSvgString(text: string): Promise<string> {
  return QRCode.toString(text, {
    type: "svg",
    margin: 2,
    errorCorrectionLevel: "M",
  });
}
