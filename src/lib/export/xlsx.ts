// Thin wrapper around SheetJS for our export/import needs. Keeps callers
// free of xlsx peculiarities (sheet naming, default options, etc).

import * as XLSX from "xlsx";

export type SheetCell = string | number | boolean | null | undefined | Date;
export type SheetRow = SheetCell[];

export function buildXlsx(headers: string[], rows: Iterable<SheetRow>, sheetName = "Sheet1"): Uint8Array {
  const aoa: SheetCell[][] = [headers, ...Array.from(rows)];
  const ws = XLSX.utils.aoa_to_sheet(aoa);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName.slice(0, 31));
  const buf = XLSX.write(wb, { type: "array", bookType: "xlsx" }) as ArrayBuffer;
  return new Uint8Array(buf);
}

export type XlsxParseResult = {
  headers: string[];
  rows: Record<string, string>[];
};

// Reads the first sheet and returns rows keyed by header. All cells coerced
// to trimmed strings — same shape as our CSV parser so import handlers can
// treat both inputs uniformly.
export function parseXlsx(input: ArrayBuffer): XlsxParseResult {
  const wb = XLSX.read(input, { type: "array" });
  const firstSheetName = wb.SheetNames[0];
  if (!firstSheetName) return { headers: [], rows: [] };
  const ws = wb.Sheets[firstSheetName];
  const aoa = XLSX.utils.sheet_to_json(ws, {
    header: 1,
    raw: false,
    defval: "",
    blankrows: false,
  }) as unknown[][];

  if (aoa.length === 0) return { headers: [], rows: [] };

  const headers = (aoa[0] as unknown[]).map((cell) => String(cell ?? "").trim());
  const rows = aoa.slice(1).map((cells) => {
    const obj: Record<string, string> = {};
    headers.forEach((h, idx) => {
      obj[h] = String((cells as unknown[])[idx] ?? "").trim();
    });
    return obj;
  });
  return { headers, rows };
}
