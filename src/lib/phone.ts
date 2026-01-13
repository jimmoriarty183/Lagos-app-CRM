export function normalizePhone(input: string): string {
  if (!input) return "";

  // оставляем только цифры
  const digits = input.replace(/\D/g, "");

  // минимальная защита
  if (digits.length < 10) return "";

  // если начинается с 0 → считаем UA
  if (digits.startsWith("0")) {
    return "38" + digits;
  }

  // если уже с кодом страны
  return digits;
}
