type LogLevel = "debug" | "info" | "warn" | "error";

type ErrorLogShape = {
  error: unknown;
  errorName?: string;
  errorMessage: string;
  errorStack?: string;
};

function stringifyUnknown(value: unknown): string {
  if (typeof value === "string") return value;
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

export function formatErrorForLog(error: unknown): ErrorLogShape {
  if (error instanceof Error) {
    return {
      error,
      errorName: error.name,
      errorMessage: error.message,
      errorStack: error.stack,
    };
  }

  const maybeError = error as { name?: unknown; message?: unknown; stack?: unknown } | null;
  return {
    error,
    errorName:
      maybeError && typeof maybeError.name === "string" ? maybeError.name : undefined,
    errorMessage:
      maybeError && typeof maybeError.message === "string"
        ? maybeError.message
        : stringifyUnknown(error),
    errorStack:
      maybeError && typeof maybeError.stack === "string" ? maybeError.stack : undefined,
  };
}

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

  if (level === "debug") {
    console.debug(entry);
    return;
  }
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

