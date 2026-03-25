import { normalizeEnumLabel, supportPriorityTone, supportStatusTone } from "@/lib/support/utils";

function prettyEnum(value: string | null | undefined) {
  const normalized = normalizeEnumLabel(value);
  return normalized.replaceAll("_", " ");
}

export function SupportStatusBadge({ status }: { status: string | null | undefined }) {
  return (
    <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${supportStatusTone(status)}`}>
      {prettyEnum(status)}
    </span>
  );
}

export function SupportPriorityBadge({ priority }: { priority: string | null | undefined }) {
  return (
    <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${supportPriorityTone(priority)}`}>
      {prettyEnum(priority)}
    </span>
  );
}

