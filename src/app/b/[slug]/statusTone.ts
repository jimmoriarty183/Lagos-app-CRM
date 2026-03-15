import {
  getStatusTone,
  type BusinessStatusDefinition,
  type StatusTone,
  type StatusValue,
} from "@/lib/business-statuses";

export type Status = StatusValue;

export function statusTone(
  status: Status,
  customStatuses: readonly BusinessStatusDefinition[] = [],
): StatusTone {
  return getStatusTone(status, customStatuses);
}

export const badgeStyleStatus = statusTone;
