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
          setCustomStatuses(Array.isArray(json.statuses) ? json.statuses : []);
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

  return {
    builtInStatuses: DEFAULT_STATUS_DEFINITIONS,
    customStatuses,
    statuses,
  };
}
