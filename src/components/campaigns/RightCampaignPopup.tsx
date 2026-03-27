"use client";

import { useCallback, useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { CampaignBellItem, Survey } from "@/lib/campaigns/types";
import { CampaignDeliveryBadge, CampaignReadBadge, CampaignTypeBadge } from "@/components/campaigns/CampaignBadges";
import { SurveyForm } from "@/components/campaigns/SurveyForm";
import { Button } from "@/components/ui/button";

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
  const searchParamsValue = searchParams.toString();
  const campaignIdFromBell = String(searchParams.get("campaign") ?? "").trim();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [item, setItem] = useState<CampaignBellItem | null>(null);
  const [survey, setSurvey] = useState<Survey | null>(null);
  const [myAnswers, setMyAnswers] = useState<Record<string, string[]>>({});
  const [surveyCompletedFromAnswers, setSurveyCompletedFromAnswers] = useState(false);
  const [dismissBusy, setDismissBusy] = useState(false);
  const isSurvey = item?.type === "survey";
  const isSurveyCompleted = Boolean(item?.isCompleted) || surveyCompletedFromAnswers;
  const shouldHideQuestionTitle =
    Boolean(
      isSurvey &&
      item?.title &&
      survey?.questions.length === 1 &&
      survey.questions[0]?.title?.trim().toLowerCase() === item.title.trim().toLowerCase(),
    );

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
          setMyAnswers({});
          const next = new URLSearchParams(searchParamsValue);
          next.delete("campaign");
          const query = next.toString();
          router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
          setLoading(false);
          return;
        }
        setItem(match);
        if (match.type === "survey") {
          const surveyResponse = await fetch(`/api/campaigns/survey/${encodeURIComponent(match.id)}`, { cache: "no-store" });
          const surveyJson = await safeJson<{
            ok: boolean;
            survey?: Survey;
            myAnswers?: Record<string, string[]>;
            error?: string;
          }>(surveyResponse);
          if (!surveyResponse.ok || !surveyJson?.ok) {
            setSurvey(null);
            setMyAnswers({});
            setSurveyCompletedFromAnswers(false);
            setError(surveyJson?.error ?? "Failed to load survey");
            setLoading(false);
            return;
          }
          const nextSurvey = surveyJson.survey ?? null;
          const nextAnswers = surveyJson.myAnswers ?? {};
          setSurvey(nextSurvey);
          setMyAnswers(nextAnswers);
          const hasAnyAnswers = Object.values(nextAnswers).some((answer) => answer.length > 0);
          setSurveyCompletedFromAnswers(hasAnyAnswers);
        } else {
          setSurvey(null);
          setMyAnswers({});
          setSurveyCompletedFromAnswers(false);
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
      setMyAnswers({});
      setSurveyCompletedFromAnswers(false);
      setLoading(false);
    } catch (loadError: unknown) {
      setItem(null);
      setSurvey(null);
      setMyAnswers({});
      setSurveyCompletedFromAnswers(false);
      setLoading(false);
      setError(loadError instanceof Error ? loadError.message : "Failed to load popup");
    }
  }, [campaignIdFromBell, pathname, router, searchParamsValue]);

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

  useEffect(() => {
    if (!item) return;
    void fetch("/api/campaigns/open", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ campaignId: item.id, channel: "popup_right" }),
    });
  }, [item]);

  useEffect(() => {
    if (loading || !item) return;
    document.body.classList.add("campaign-popup-open");
    return () => {
      document.body.classList.remove("campaign-popup-open");
    };
  }, [loading, item]);

  const dismiss = async () => {
    if (!item) return;
    setDismissBusy(true);
    await fetch("/api/campaigns/click", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ campaignId: item.id, channel: "popup_right" }),
    });
    await fetch("/api/campaigns/dismiss", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ campaignId: item.id }),
    });
    setDismissBusy(false);
    if (campaignIdFromBell) {
      const next = new URLSearchParams(searchParamsValue);
      next.delete("campaign");
      const query = next.toString();
      router.push(query ? `${pathname}?${query}` : pathname, { scroll: false });
      return;
    }
    setItem(null);
  };

  if (loading || !item) return null;

  return (
    <>
      <div className="fixed inset-0 z-[70] bg-slate-900/24 backdrop-blur-[1px]" />
      <aside className="fixed left-1/2 top-1/2 z-[80] w-[420px] max-w-[calc(100vw-1.25rem)] -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_24px_60px_-24px_rgba(15,23,42,0.45)]">
        {error ? (
          <div className="mb-3 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-600">{error}</div>
        ) : null}

        <div className="flex items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-1.5">
            <CampaignTypeBadge type={item.type} />
            <CampaignDeliveryBadge channels={item.channels} />
            <CampaignReadBadge isRead={item.isRead} />
            {isSurvey && isSurveyCompleted ? (
              <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
                Voted
              </span>
            ) : null}
          </div>
        </div>
        <div className="mt-2 text-[18px] font-semibold leading-6 text-slate-900">{item.title}</div>

        {item.body ? <p className="mt-2 text-sm leading-6 text-slate-600">{item.body}</p> : null}

        <div className="mt-4">
          {isSurvey ? (
            survey ? (
              <SurveyForm
                survey={survey}
                helperText={isSurveyCompleted ? "You already voted. You can review your selection." : "Choose one answer and submit."}
                hideSingleQuestionTitle={shouldHideQuestionTitle}
                optionLayout="numbered_column"
                initialAnswers={myAnswers}
                readOnly={isSurveyCompleted}
                onClose={dismiss}
                onSubmitted={() => {
                  setSurveyCompletedFromAnswers(true);
                  setItem(null);
                  if (campaignIdFromBell) {
                    const next = new URLSearchParams(searchParamsValue);
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
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                onClick={dismiss}
                disabled={dismissBusy}
                size="sm"
                className="h-9 px-3.5 disabled:cursor-not-allowed"
              >
                {dismissBusy ? "Saving..." : "Got it"}
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={dismiss}
                disabled={dismissBusy}
                className="h-9 border-slate-300 bg-white px-3.5 text-slate-700 hover:border-slate-400 hover:text-slate-900 disabled:opacity-60"
              >
                Close for now
              </Button>
            </div>
          )}
        </div>

      </aside>
      <style jsx global>{`
        body.campaign-popup-open [data-desktop-left-rail="1"] {
          opacity: 0.58;
          filter: saturate(0.82);
        }
      `}</style>
    </>
  );
}
