type LogLevel = "info" | "warn" | "error";

export function billingLog(
  level: LogLevel,
  event: string,
  data: Record<string, unknown> = {},
) {
  const entry = {
    scope: "billing",
    event,
    ...data,
    at: new Date().toISOString(),
  };

  if (level === "error") {
    console.error(entry);
    return;
  }
  if (level === "warn") {
    console.warn(entry);
    return;
  }
  console.info(entry);
}

