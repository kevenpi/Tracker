/**
 * Minimal CSV parser supporting quoted fields and commas inside quotes.
 * Returns an array of row objects keyed by lower-cased header names.
 */
export function parseCsv(text: string): Record<string, string>[] {
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length < 2) return [];

  const headers = splitLine(lines[0]).map((h) =>
    h.trim().toLowerCase().replace(/^"(.*)"$/, "$1")
  );

  const rows: Record<string, string>[] = [];
  for (let i = 1; i < lines.length; i++) {
    const values = splitLine(lines[i]);
    const row: Record<string, string> = {};
    headers.forEach((h, idx) => {
      row[h] = (values[idx] ?? "").trim();
    });
    rows.push(row);
  }
  return rows;
}

function splitLine(line: string): string[] {
  const values: string[] = [];
  let current = "";
  let inQuotes = false;
  for (const char of line) {
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === "," && !inQuotes) {
      values.push(current);
      current = "";
    } else {
      current += char;
    }
  }
  values.push(current);
  return values;
}

/** Pull a value from a row by trying several possible header aliases. */
export function field(
  row: Record<string, string>,
  aliases: string[]
): string {
  for (const a of aliases) {
    if (row[a] != null && row[a] !== "") return row[a];
  }
  return "";
}
