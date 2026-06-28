import UAParser from "ua-parser-js";

export type ParsedUA = {
  deviceType: string | null;
  os: string | null;
  browser: string | null;
};

/**
 * Parse a raw User-Agent string into device type / OS / browser.
 * ua-parser-js leaves device.type undefined for desktops, so we default to
 * "desktop" when a UA is present but no mobile/tablet/etc. type was detected.
 */
export function parseUA(ua: string | null | undefined): ParsedUA {
  if (!ua) return { deviceType: null, os: null, browser: null };

  const result = new UAParser(ua).getResult();
  const join = (a?: string, b?: string) =>
    [a, b].filter(Boolean).join(" ") || null;

  return {
    deviceType: result.device.type ?? "desktop",
    os: join(result.os.name, result.os.version),
    browser: join(result.browser.name, result.browser.version),
  };
}
