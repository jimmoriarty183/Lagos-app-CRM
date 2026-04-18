// Minimal RFC-4180-ish CSV builder. Enough for SMB exports opened in Excel,
// Google Sheets, LibreOffice. UTF-8 BOM prepended so Excel picks up non-ASCII.

export type CsvCell = string | number | boolean | null | undefined | Date;
export type CsvRow = CsvCell[];

function escapeCell(value: CsvCell): string {
  if (value === null || value === undefined) return "";
  let str: string;
  if (value instanceof Date) {
    str = Number.isNaN(value.getTime()) ? "" : value.toISOString();
  } else if (typeof value === "number") {
    str = Number.isFinite(value) ? String(value) : "";
  } else if (typeof value === "boolean") {
    str = value ? "true" : "false";
  } else {
    str = String(value);
  }
  const needsQuoting = /[",\r\n]/.test(str);
  if (!needsQuoting) return str;
  return `"${str.replaceAll('"', '""')}"`;
}

export function buildCsv(headers: string[], rows: Iterable<CsvRow>): string {
  const lines: string[] = [headers.map(escapeCell).join(",")];
  for (const row of rows) {
    lines.push(row.map(escapeCell).join(","));
  }
  return "\uFEFF" + lines.join("\r\n");
}

export function filenameFor(base: string, slug: string, ext = "csv") {
  const date = new Date().toISOString().slice(0, 10);
  const safeSlug = slug.replace(/[^a-z0-9_-]+/gi, "-").toLowerCase();
  return `${base}-${safeSlug}-${date}.${ext}`;
}
