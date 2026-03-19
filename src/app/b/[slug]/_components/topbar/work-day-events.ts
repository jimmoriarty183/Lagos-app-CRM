"use client";

export const WORK_DAY_UPDATED_EVENT = "ordero-work-day-updated";

export function emitWorkDayUpdated() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(WORK_DAY_UPDATED_EVENT));
}
