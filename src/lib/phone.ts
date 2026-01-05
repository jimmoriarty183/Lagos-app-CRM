// lib/phone.ts
export function normalizePhone(input: string) {
  // убираем пробелы, скобки, тире, плюс и всё не-цифры
  return (input || "").replace(/\D/g, "");
}
