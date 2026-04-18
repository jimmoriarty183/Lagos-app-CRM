// Minimal RFC-4180-ish CSV parser. Handles quoted fields, escaped quotes,
// CRLF / LF line endings, and the UTF-8 BOM that Excel often prepends.
// Returns an array of records keyed by the header row.

export type CsvParseResult = {
  headers: string[];
  rows: Record<string, string>[];
};

export function parseCsv(input: string): CsvParseResult {
  // Strip BOM if present.
  const text = input.replace(/^\uFEFF/, "");
  const matrix: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];

    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          cell += '"';
          i += 1;
        } else {
          inQuotes = false;
        }
      } else {
        cell += ch;
      }
      continue;
    }

    if (ch === '"') {
      inQuotes = true;
      continue;
    }
    if (ch === ",") {
      row.push(cell);
      cell = "";
      continue;
    }
    if (ch === "\r") {
      // ignore — handled by the following \n
      continue;
    }
    if (ch === "\n") {
      row.push(cell);
      matrix.push(row);
      row = [];
      cell = "";
      continue;
    }
    cell += ch;
  }
  // flush trailing
  if (cell.length > 0 || row.length > 0) {
    row.push(cell);
    matrix.push(row);
  }

  // Drop empty trailing rows.
  while (matrix.length > 0 && matrix[matrix.length - 1].every((c) => c === "")) {
    matrix.pop();
  }

  if (matrix.length === 0) return { headers: [], rows: [] };

  const headers = matrix[0].map((h) => h.trim());
  const rows = matrix.slice(1).map((cells) => {
    const obj: Record<string, string> = {};
    headers.forEach((h, idx) => {
      obj[h] = (cells[idx] ?? "").trim();
    });
    return obj;
  });

  return { headers, rows };
}
