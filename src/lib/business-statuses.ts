export type StatusValue = string;
export type StatusFilterValue = StatusValue | "OVERDUE";

export type StatusColorToken =
  | "slate"
  | "blue"
  | "amber"
  | "green"
  | "red"
  | "violet"
  | "pink"
  | "teal";

export type StatusColorValue = StatusColorToken | `#${string}`;

export type StatusTone = {
  background: string;
  color: string;
  dot: string;
  selectedBackground: string;
};

export type BusinessStatusDefinition = {
  value: StatusValue;
  label: string;
  color: StatusColorValue;
  sortOrder?: number;
  active?: boolean;
  builtIn?: boolean;
};

export type StatusColorOption = {
  value: StatusColorValue;
  label: string;
  swatch: string;
};

type PersistedStatusDefinition = {
  value?: unknown;
  label?: unknown;
  color?: unknown;
  sort_order?: unknown;
};

const STATUSES_EVENT = "business-statuses-change";
const INACTIVE_SORT_OFFSET = 1000;

const STATUS_COLOR_MAP: Record<StatusColorToken, StatusColorOption & StatusTone> = {
  slate: {
    value: "slate",
    label: "Slate",
    swatch: "#64748B",
    background: "#F1F5F9",
    color: "#475569",
    dot: "#64748B",
    selectedBackground: "#E7EDF5",
  },
  blue: {
    value: "blue",
    label: "Blue",
    swatch: "#2563EB",
    background: "#EFF6FF",
    color: "#2563EB",
    dot: "#2563EB",
    selectedBackground: "#DFECFF",
  },
  amber: {
    value: "amber",
    label: "Amber",
    swatch: "#EA580C",
    background: "#FFF7ED",
    color: "#EA580C",
    dot: "#C2410C",
    selectedBackground: "#FFE9D6",
  },
  green: {
    value: "green",
    label: "Green",
    swatch: "#059669",
    background: "#ECFDF5",
    color: "#059669",
    dot: "#047857",
    selectedBackground: "#DDF7EA",
  },
  red: {
    value: "red",
    label: "Red",
    swatch: "#DC2626",
    background: "#FEF2F2",
    color: "#DC2626",
    dot: "#B91C1C",
    selectedBackground: "#FDE2E2",
  },
  violet: {
    value: "violet",
    label: "Violet",
    swatch: "#756EAE",
    background: "#F5F3FF",
    color: "#756EAE",
    dot: "#9A93D6",
    selectedBackground: "#ECE8FF",
  },
  pink: {
    value: "pink",
    label: "Pink",
    swatch: "#DB2777",
    background: "#FDF2F8",
    color: "#DB2777",
    dot: "#BE185D",
    selectedBackground: "#FCE7F3",
  },
  teal: {
    value: "teal",
    label: "Teal",
    swatch: "#0F766E",
    background: "#F0FDFA",
    color: "#0F766E",
    dot: "#115E59",
    selectedBackground: "#CCFBF1",
  },
};

export const DEFAULT_STATUS_DEFINITIONS: readonly BusinessStatusDefinition[] = [
  { value: "NEW", label: "New", color: "slate", builtIn: true, active: true, sortOrder: 0 },
  { value: "IN_PROGRESS", label: "In progress", color: "blue", builtIn: true, active: true, sortOrder: 1 },
  { value: "WAITING_PAYMENT", label: "Waiting payment", color: "amber", builtIn: true, active: true, sortOrder: 2 },
  { value: "DONE", label: "Done", color: "green", builtIn: true, active: true, sortOrder: 3 },
  { value: "CANCELED", label: "Canceled", color: "red", builtIn: true, active: true, sortOrder: 4 },
  { value: "DUPLICATE", label: "Duplicate", color: "violet", builtIn: true, active: true, sortOrder: 5 },
] as const;

export const DEFAULT_VISIBLE_STATUSES: readonly StatusValue[] = [
  "NEW",
  "IN_PROGRESS",
  "WAITING_PAYMENT",
] as const;

export const DEFAULT_VISIBLE_STATUS_FILTERS: readonly StatusFilterValue[] = [
  ...DEFAULT_VISIBLE_STATUSES,
  "OVERDUE",
] as const;

export const STATUS_COLOR_OPTIONS = Object.values(STATUS_COLOR_MAP);
export const TERMINAL_STATUS_VALUES: readonly StatusValue[] = [
  "DONE",
  "CANCELED",
  "DUPLICATE",
] as const;
export const REQUIRED_WORKFLOW_STATUS_VALUES: readonly StatusValue[] = [
  "NEW",
  "IN_PROGRESS",
  "DONE",
  "CANCELED",
  "DUPLICATE",
] as const;

function cleanText(value: unknown) {
  return String(value ?? "").trim();
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function isHexColor(value: string): value is `#${string}` {
  return /^#(?:[0-9a-f]{6}|[0-9a-f]{3})$/i.test(value);
}

function expandHex(value: `#${string}`) {
  const clean = value.slice(1);
  if (clean.length === 3) {
    return `#${clean
      .split("")
      .map((char) => `${char}${char}`)
      .join("")}`.toUpperCase() as `#${string}`;
  }
  return `#${clean}`.toUpperCase() as `#${string}`;
}

function hexToRgb(value: `#${string}`) {
  const hex = expandHex(value).slice(1);
  return {
    r: Number.parseInt(hex.slice(0, 2), 16),
    g: Number.parseInt(hex.slice(2, 4), 16),
    b: Number.parseInt(hex.slice(4, 6), 16),
  };
}

function toHexChannel(value: number) {
  return clamp(Math.round(value), 0, 255).toString(16).padStart(2, "0");
}

function toLinearChannel(value: number) {
  const normalized = clamp(value, 0, 255) / 255;
  if (normalized <= 0.04045) {
    return normalized / 12.92;
  }
  return ((normalized + 0.055) / 1.055) ** 2.4;
}

function mixHex(base: `#${string}`, target: `#${string}`, weight: number) {
  const from = hexToRgb(base);
  const to = hexToRgb(target);
  const ratio = clamp(weight, 0, 1);
  return (
    `#${toHexChannel(from.r + (to.r - from.r) * ratio)}${toHexChannel(
      from.g + (to.g - from.g) * ratio,
    )}${toHexChannel(from.b + (to.b - from.b) * ratio)}`.toUpperCase()
  ) as `#${string}`;
}

function relativeLuminance(value: `#${string}`) {
  const { r, g, b } = hexToRgb(value);
  return 0.2126 * toLinearChannel(r) + 0.7152 * toLinearChannel(g) + 0.0722 * toLinearChannel(b);
}

function contrastRatio(background: `#${string}`, foreground: `#${string}`) {
  const lighter = Math.max(relativeLuminance(background), relativeLuminance(foreground));
  const darker = Math.min(relativeLuminance(background), relativeLuminance(foreground));
  return (lighter + 0.05) / (darker + 0.05);
}

function pickReadableTextColor(background: `#${string}`, preferred: `#${string}`) {
  const white = "#FFFFFF" as const;
  const dark = "#0F172A" as const;
  const preferredContrast = contrastRatio(background, preferred);

  if (preferredContrast >= 4.5) {
    return preferred;
  }

  return contrastRatio(background, white) >= contrastRatio(background, dark) ? white : dark;
}

function buildCustomStatusTone(value: `#${string}`): StatusColorOption & StatusTone {
  const swatch = expandHex(value);
  const isDark = relativeLuminance(swatch) < 0.18;
  const background = isDark ? mixHex(swatch, "#FFFFFF", 0.14) : mixHex(swatch, "#FFFFFF", 0.88);
  const selectedBackground = isDark ? mixHex(swatch, "#FFFFFF", 0.22) : mixHex(swatch, "#FFFFFF", 0.8);
  const preferredText = isDark ? ("#FFFFFF" as const) : mixHex(swatch, "#0F172A", 0.1);

  return {
    value: swatch,
    label: "Custom",
    swatch,
    background,
    color: pickReadableTextColor(background, preferredText),
    dot: swatch,
    selectedBackground,
  };
}

export function normalizeStatusColor(input: unknown): StatusColorValue {
  const color = cleanText(input);
  if ((color as StatusColorToken) in STATUS_COLOR_MAP) return color as StatusColorToken;
  if (isHexColor(color)) return expandHex(color);
  return "slate";
}

export function getClosestStatusColorToken(input: unknown): StatusColorToken {
  const normalized = normalizeStatusColor(input);
  if ((normalized as StatusColorToken) in STATUS_COLOR_MAP) {
    return normalized as StatusColorToken;
  }

  const sample = hexToRgb(normalized as `#${string}`);
  let closest: StatusColorToken = "slate";
  let closestDistance = Number.POSITIVE_INFINITY;

  for (const option of STATUS_COLOR_OPTIONS) {
    const swatch = hexToRgb(option.swatch as `#${string}`);
    const distance =
      (sample.r - swatch.r) ** 2 +
      (sample.g - swatch.g) ** 2 +
      (sample.b - swatch.b) ** 2;

    if (distance < closestDistance) {
      closestDistance = distance;
      closest = option.value as StatusColorToken;
    }
  }

  return closest;
}

export function getBusinessStatusesEventName() {
  return STATUSES_EVENT;
}

export function sanitizeStatusValue(input: string) {
  const normalized = input
    .trim()
    .replace(/[^a-zA-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .replace(/_+/g, "_")
    .toUpperCase();

  return normalized.slice(0, 48);
}

export function humanizeStatusValue(status: string) {
  const text = cleanText(status);
  if (!text) return "Unknown";

  return text
    .toLowerCase()
    .split(/[_\s-]+/)
    .filter(Boolean)
    .map((part) => part[0]?.toUpperCase() + part.slice(1))
    .join(" ");
}

export function isBuiltInStatus(status: string) {
  return DEFAULT_STATUS_DEFINITIONS.some((item) => item.value === status);
}

export function isTerminalStatus(status: string) {
  return TERMINAL_STATUS_VALUES.includes(cleanText(status).toUpperCase());
}

export function isRequiredWorkflowStatus(status: string) {
  return REQUIRED_WORKFLOW_STATUS_VALUES.includes(cleanText(status).toUpperCase());
}

export function normalizeStatusDefinition(
  input: PersistedStatusDefinition,
): BusinessStatusDefinition | null {
  const label = cleanText(input.label);
  const value = sanitizeStatusValue(cleanText(input.value) || label);
  const sortOrderRaw = Number(input.sort_order);
  const sortOrder = Number.isFinite(sortOrderRaw) ? sortOrderRaw : undefined;

  if (!label || !value || value === "OVERDUE") return null;

  return {
    value,
    label,
    color: normalizeStatusColor(input.color),
    sortOrder,
    active: sortOrder === undefined ? true : sortOrder < INACTIVE_SORT_OFFSET,
  };
}

export function mergeBusinessStatuses(
  customStatuses: readonly BusinessStatusDefinition[],
) {
  const merged = new Map<string, BusinessStatusDefinition>();

  for (const item of DEFAULT_STATUS_DEFINITIONS) {
    merged.set(item.value, item);
  }

  for (const item of customStatuses) {
    if (!item?.value) continue;
    const normalizedItem: BusinessStatusDefinition = {
      value: item.value,
      label: cleanText(item.label) || humanizeStatusValue(item.value),
      color: normalizeStatusColor(item.color),
      sortOrder: item.sortOrder,
      active: item.active ?? true,
      builtIn: isBuiltInStatus(item.value),
    };
    const previous = merged.get(item.value);
    merged.set(item.value, previous ? { ...previous, ...normalizedItem } : normalizedItem);
  }

  const builtInRank = new Map<string, number>(
    DEFAULT_STATUS_DEFINITIONS.map((item, index) => [item.value, index]),
  );

  return Array.from(merged.values()).sort((left, right) => {
    const leftActive = left.active !== false;
    const rightActive = right.active !== false;
    if (leftActive !== rightActive) return leftActive ? -1 : 1;

    const leftOrder = Number.isFinite(left.sortOrder) ? Number(left.sortOrder) : Number.MAX_SAFE_INTEGER;
    const rightOrder = Number.isFinite(right.sortOrder) ? Number(right.sortOrder) : Number.MAX_SAFE_INTEGER;
    if (leftOrder !== rightOrder) return leftOrder - rightOrder;

    const leftBuiltIn = Boolean(left.builtIn);
    const rightBuiltIn = Boolean(right.builtIn);
    if (leftBuiltIn && rightBuiltIn) {
      return (builtInRank.get(left.value) ?? 0) - (builtInRank.get(right.value) ?? 0);
    }

    if (leftBuiltIn !== rightBuiltIn) {
      return leftBuiltIn ? -1 : 1;
    }

    return left.label.localeCompare(right.label);
  });
}

export function getStatusDefinition(
  status: string,
  customStatuses: readonly BusinessStatusDefinition[] = [],
) {
  const normalized = cleanText(status).toUpperCase();
  const merged = mergeBusinessStatuses(customStatuses);
  return (
    merged.find((item) => item.value === normalized) ?? {
      value: normalized || "UNKNOWN",
      label: humanizeStatusValue(normalized),
      color: "slate" as StatusColorValue,
      builtIn: false,
    }
  );
}

export function getStatusLabel(
  status: string,
  customStatuses: readonly BusinessStatusDefinition[] = [],
) {
  return getStatusDefinition(status, customStatuses).label;
}

export function getStatusTone(
  status: string,
  customStatuses: readonly BusinessStatusDefinition[] = [],
): StatusTone {
  const definition = getStatusDefinition(status, customStatuses);
  return getStatusColorOption(definition.color);
}

export function getStatusColorOption(color: StatusColorValue) {
  if ((color as StatusColorToken) in STATUS_COLOR_MAP) {
    return STATUS_COLOR_MAP[color as StatusColorToken] ?? STATUS_COLOR_MAP.slate;
  }
  if (isHexColor(color)) {
    return buildCustomStatusTone(color);
  }
  return STATUS_COLOR_MAP.slate;
}

export function getDefaultVisibleStatuses(
  customStatuses: readonly BusinessStatusDefinition[] = [],
) {
  return mergeBusinessStatuses(customStatuses)
    .filter((status) => !isTerminalStatus(status.value))
    .map((status) => status.value);
}

export function getDefaultVisibleStatusFilters(
  customStatuses: readonly BusinessStatusDefinition[] = [],
) {
  return [...getDefaultVisibleStatuses(customStatuses), "OVERDUE" as const];
}

export function getWorkflowStatuses(
  customStatuses: readonly BusinessStatusDefinition[] = [],
) {
  return mergeBusinessStatuses(customStatuses).filter((status) => status.active !== false);
}

export function getInactiveWorkflowStatuses(
  customStatuses: readonly BusinessStatusDefinition[] = [],
) {
  return mergeBusinessStatuses(customStatuses).filter((status) => status.active === false);
}
