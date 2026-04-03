export function formatDisplayOrderNumber(input: {
  orderNumber?: number | string | null;
  orderId?: string | number | null;
}) {
  const numberRaw = Number(input.orderNumber ?? NaN);
  if (Number.isFinite(numberRaw) && numberRaw > 0) {
    return `#${Math.floor(numberRaw)}`;
  }

  const idText = String(input.orderId ?? "").replace(/[^a-zA-Z0-9]/g, "");
  if (!idText) return "Unnumbered order";
  return `ORD-${idText.slice(0, 8).toUpperCase()}`;
}

export function isTurnoverEligibleStatus(status: string | null | undefined) {
  const normalized = String(status ?? "").trim().toUpperCase();
  return !(
    normalized === "DEL" ||
    normalized === "DELETED" ||
    normalized === "CANCELLED" ||
    normalized === "CANCELED"
  );
}
