"use client";

import { useEffect, useMemo, useState } from "react";
import {
  DEFAULT_STATUS_DEFINITIONS,
  getBusinessStatusesEventName,
  mergeBusinessStatuses,
  type BusinessStatusDefinition,
} from "@/lib/business-statuses";

export function useBusinessStatuses(businessId: string) {
  const [customStatuses, setCustomStatuses] = useState<BusinessStatusDefinition[]>([]);

  useEffect(() => {
    if (!businessId) return;

    let alive = true;

    const load = async () => {
      try {
        const res = await fetch(
          `/api/business/statuses?businessId=${encodeURIComponent(businessId)}`,
          {
            credentials: "same-origin",
            cache: "no-store",
          },
        );

        if (!res.ok) {
          if (alive) setCustomStatuses([]);
          return;
        }

        const json = (await res.json()) as {
          statuses?: BusinessStatusDefinition[];
        };

        if (alive) {
          const nextStatuses = Array.isArray(json.statuses) ? json.statuses : [];
          console.log("[use-business-statuses] API statuses", {
            businessId,
            statuses: nextStatuses.map((status) => ({
              value: status.value,
              label: status.label,
              active: status.active,
              builtIn: status.builtIn ?? false,
              sortOrder: status.sortOrder,
            })),
            hasDEL: nextStatuses.some((status) => status.value === "DEL"),
          });
          setCustomStatuses(nextStatuses);
        }
      } catch {
        if (alive) setCustomStatuses([]);
      }
    };

    void load();

    const handleRefresh = (event: Event) => {
      const customEvent = event as CustomEvent<{ businessId?: string }>;
      if (customEvent.detail?.businessId && customEvent.detail.businessId !== businessId) return;
      void load();
    };

    window.addEventListener(getBusinessStatusesEventName(), handleRefresh);

    return () => {
      alive = false;
      window.removeEventListener(getBusinessStatusesEventName(), handleRefresh);
    };
  }, [businessId]);

  const statuses = useMemo(
    () => mergeBusinessStatuses(customStatuses),
    [customStatuses],
  );

  useEffect(() => {
    console.log("[use-business-statuses] merged statuses", {
      businessId,
      statuses: statuses.map((status) => ({
        value: status.value,
        label: status.label,
        active: status.active,
        builtIn: status.builtIn ?? false,
        sortOrder: status.sortOrder,
      })),
      hasDEL: statuses.some((status) => status.value === "DEL"),
    });
  }, [businessId, statuses]);

  return {
    builtInStatuses: DEFAULT_STATUS_DEFINITIONS,
    customStatuses,
    statuses,
  };
}
