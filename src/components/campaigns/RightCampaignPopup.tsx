"use client";

import { useCallback, useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { CampaignBellItem, Survey } from "@/lib/campaigns/types";
import { SurveyForm } from "@/components/campaigns/SurveyForm";

async function safeJson<T>(response: Response): Promise<T | null> {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

export function RightCampaignPopup() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const campaignIdFromBell = String(searchParams.get("campaign") ?? "").trim();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [item, setItem] = useState<CampaignBellItem | null>(null);
  const [survey, setSurvey] = useState<Survey | null>(null);
  const [dismissBusy, setDismissBusy] = useState(false);

  const loadPopup = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      if (campaignIdFromBell) {
        const bellResponse = await fetch("/api/campaigns/bell", { cache: "no-store" });
        const bellJson = await safeJson<{ ok: boolean; items?: CampaignBellItem[]; error?: string }>(bellResponse);
        if (!bellResponse.ok || !bellJson?.ok) {
          setItem(null);
          setSurvey(null);
          setError(bellJson?.error ?? "Failed to load campaign");
          setLoading(false);
          return;
        }
        const match = (bellJson.items ?? []).find((candidate) => candidate.id === campaignIdFromBell) ?? null;
        if (!match) {
          setItem(null);
          setSurvey(null);
          setLoading(false);
          return;
        }
        setItem(match);
        if (match.type === "survey") {
          const surveyResponse = await fetch(`/api/campaigns/survey/${encodeURIComponent(match.id)}`, { cache: "no-store" });
          const surveyJson = await safeJson<{ ok: boolean; survey?: Survey; error?: string }>(surveyResponse);
          if (!surveyResponse.ok || !surveyJson?.ok) {
            setSurvey(null);
            setError(surveyJson?.error ?? "Failed to load survey");
            setLoading(false);
            return;
          }
          setSurvey(surveyJson.survey ?? null);
        } else {
          setSurvey(null);
        }
        setLoading(false);
        return;
      }

      const response = await fetch("/api/campaigns/popup", { cache: "no-store" });
      const json = await safeJson<{ ok: boolean; item?: CampaignBellItem | null; survey?: Survey | null; error?: string }>(response);
      if (!response.ok || !json?.ok) {
        setItem(null);
        setSurvey(null);
        setLoading(false);
        setError(json?.error ?? "Failed to load popup");
        return;
      }
      setItem(json.item ?? null);
      setSurvey(json.survey ?? null);
      setLoading(false);
    } catch (loadError: unknown) {
      setItem(null);
      setSurvey(null);
      setLoading(false);
      setError(loadError instanceof Error ? loadError.message : "Failed to load popup");
    }
  }, [campaignIdFromBell]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadPopup();
    }, 0);
    const interval = window.setInterval(() => {
      void loadPopup();
    }, 30_000);
    const onFocus = () => {
      void loadPopup();
    };
    window.addEventListener("focus", onFocus);
    return () => {
      window.clearTimeout(timer);
      window.clearInterval(interval);
      window.removeEventListener("focus", onFocus);
    };
  }, [loadPopup]);

  useEffect(() => {
    if (!campaignIdFromBell || !item || item.isRead) return;
    const markRead = async () => {
      await fetch("/api/campaigns/read", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ campaignId: item.id }),
      });
    };
    void markRead();
  }, [campaignIdFromBell, item]);

  const dismiss = async () => {
    if (!item) return;
    if (campaignIdFromBell) {
      const next = new URLSearchParams(searchParams.toString());
      next.delete("campaign");
      const query = next.toString();
      router.push(query ? `${pathname}?${query}` : pathname, { scroll: false });
      return;
    }
    setDismissBusy(true);
    const response = await fetch("/api/campaigns/dismiss", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ campaignId: item.id }),
    });
    const json = await safeJson<{ ok: boolean }>(response);
    setDismissBusy(false);
    if (!response.ok || !json?.ok) return;
    setItem(null);
  };

  if (loading || !item) return null;

  return (
    <aside className="fixed right-4 top-20 z-40 w-[380px] max-w-[calc(100vw-1.5rem)] rounded-2xl border border-slate-200 bg-white p-4 shadow-2xl">
      {error ? (
        <div className="mb-3 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-600">{error}</div>
      ) : null}

      <div className="flex items-center justify-between gap-3">
        <div className="text-base font-semibold text-slate-900">{item.title}</div>
        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold uppercase text-slate-600">
          {item.type}
        </span>
      </div>

      {item.body ? <p className="mt-2 text-sm leading-6 text-slate-600">{item.body}</p> : null}

      <div className="mt-4">
        {item.type === "survey" ? (
          survey ? (
            <SurveyForm
              survey={survey}
              onSubmitted={() => {
                setItem(null);
                if (campaignIdFromBell) {
                  const next = new URLSearchParams(searchParams.toString());
                  next.delete("campaign");
                  const query = next.toString();
                  router.push(query ? `${pathname}?${query}` : pathname, { scroll: false });
                }
              }}
            />
          ) : (
            <div className="text-sm text-slate-500">Loading survey...</div>
          )
        ) : (
          <button
            type="button"
            onClick={dismiss}
            disabled={dismissBusy}
            className="inline-flex h-10 items-center rounded-lg bg-indigo-600 px-4 text-sm font-semibold text-white transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {dismissBusy ? "Saving..." : "Got it"}
          </button>
        )}
      </div>

      <div className="mt-3">
        <button
          type="button"
          onClick={dismiss}
          disabled={dismissBusy}
          className="text-xs font-medium text-slate-500 transition hover:text-slate-700 disabled:opacity-60"
        >
          Close for now
        </button>
      </div>
    </aside>
  );
}
