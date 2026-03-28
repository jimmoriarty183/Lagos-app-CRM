"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import type { Survey } from "@/lib/campaigns/types";

type SurveyAnswersState = Record<string, string[]>;

type Props = {
  survey: Survey;
  helperText?: string | null;
  hideSingleQuestionTitle?: boolean;
  optionLayout?: "chips" | "numbered_column";
  initialAnswers?: SurveyAnswersState;
  readOnly?: boolean;
  onClose?: () => void;
  onSubmitted: () => void;
};

function QuestionBlock({
  question,
  value,
  hideTitle = false,
  optionLayout = "chips",
  readOnly = false,
  onChange,
}: {
  question: Survey["questions"][number];
  value: string[];
  hideTitle?: boolean;
  optionLayout?: "chips" | "numbered_column";
  readOnly?: boolean;
  onChange: (next: string[]) => void;
}) {
  const toggle = (optionId: string) => {
    if (question.questionType === "multiple_choice") {
      const set = new Set(value);
      if (set.has(optionId)) set.delete(optionId);
      else set.add(optionId);
      onChange([...set]);
      return;
    }
    onChange([optionId]);
  };

  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3">
      {!hideTitle ? (
        <div className="text-sm font-semibold text-slate-900">{question.title}</div>
      ) : null}
      <div className={`${hideTitle ? "" : "mt-2"} ${optionLayout === "numbered_column" ? "space-y-2" : "flex flex-wrap gap-2"}`}>
        {question.options.map((option) => {
          const selected = value.includes(option.id);
          if (readOnly) {
            return (
              <div
                key={option.id}
                className={[
                  optionLayout === "numbered_column"
                    ? "flex w-full items-center gap-2 rounded-lg border px-3.5 py-2 text-left text-sm font-medium"
                    : "rounded-full border px-3.5 py-1.5 text-sm font-medium",
                  selected
                    ? "border-emerald-300 bg-emerald-50 text-emerald-800"
                    : "border-slate-200 bg-white text-slate-500",
                ].join(" ")}
              >
                {optionLayout === "numbered_column" ? (
                  <>
                    <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full border border-slate-200 bg-slate-50 px-1 text-[11px] font-semibold text-slate-600">
                      {option.optionOrder}
                    </span>
                    <span>{option.label}</span>
                  </>
                ) : (
                  option.label
                )}
              </div>
            );
          }
          return (
            <button
              key={option.id}
              type="button"
              onClick={() => toggle(option.id)}
              disabled={readOnly}
              className={[
                optionLayout === "numbered_column"
                  ? "flex w-full items-center gap-2 rounded-lg border px-3.5 py-2 text-left text-sm font-medium transition-colors"
                  : "rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors",
                selected
                  ? "border-indigo-300 bg-indigo-100 text-indigo-800"
                  : "border-slate-200 bg-white text-slate-700 hover:border-indigo-200 hover:bg-indigo-50/60",
                readOnly ? "cursor-default opacity-95" : "",
              ].join(" ")}
            >
              {optionLayout === "numbered_column" ? (
                <>
                  <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full border border-slate-200 bg-slate-50 px-1 text-[11px] font-semibold text-slate-600">
                    {option.optionOrder}
                  </span>
                  <span>{option.label}</span>
                </>
              ) : (
                option.label
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

async function safeJson<T>(response: Response): Promise<T | null> {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

export function SurveyForm({
  survey,
  helperText,
  hideSingleQuestionTitle = false,
  optionLayout = "chips",
  initialAnswers = {},
  readOnly = false,
  onClose,
  onSubmitted,
}: Props) {
  const [answers, setAnswers] = useState<SurveyAnswersState>(initialAnswers);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const isSingleQuestion = survey.questions.length === 1;

  const isComplete = useMemo(() => {
    return survey.questions.every((question) => (answers[question.id]?.length ?? 0) > 0);
  }, [answers, survey.questions]);

  useEffect(() => {
    setAnswers(initialAnswers);
  }, [initialAnswers]);

  const handleSubmit = async () => {
    if (readOnly) return;
    if (!isComplete) {
      setError("Please answer all questions");
      return;
    }
    setSubmitting(true);
    setError(null);

    const payload = {
      campaignId: survey.campaign.id,
      answers: survey.questions.map((question) => ({
        questionId: question.id,
        optionIds: answers[question.id] ?? [],
      })),
    };

    const response = await fetch("/api/campaigns/survey/submit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const json = await safeJson<{ ok: boolean; error?: string }>(response.clone());
    let fallbackError = "";
    if (!json) {
      fallbackError = await response.text().catch(() => "");
    }

    if (!response.ok || !json?.ok) {
      const text = fallbackError.trim();
      const fallback =
        text.length > 0
          ? text.slice(0, 220)
          : `Failed to submit survey (HTTP ${response.status})`;
      setError(json?.error ?? fallback);
      setSubmitting(false);
      return;
    }

    setSuccess(true);
    setSubmitting(false);
    window.dispatchEvent(new CustomEvent("campaign:state-changed", { detail: { campaignId: survey.campaign.id, action: "survey_submitted" } }));
    onSubmitted();
  };

  if (success) {
    return (
      <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700">
        Thanks. Your answers have been submitted.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {helperText ? <p className="text-xs leading-5 text-slate-500">{helperText}</p> : null}
      {survey.questions.map((question) => (
        <QuestionBlock
          key={question.id}
          question={question}
          hideTitle={hideSingleQuestionTitle && isSingleQuestion}
          optionLayout={optionLayout}
          readOnly={readOnly}
          value={answers[question.id] ?? []}
          onChange={(next) => setAnswers((current) => ({ ...current, [question.id]: next }))}
        />
      ))}
      {error ? (
        <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-600">{error}</div>
      ) : null}
      <div className="flex flex-wrap items-center gap-2">
        {!readOnly ? (
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={!isComplete || submitting}
            size="sm"
            className="h-9 px-3.5 disabled:cursor-not-allowed"
          >
            {submitting ? "Submitting..." : "Submit answers"}
          </Button>
        ) : (
          <span className="inline-flex h-9 items-center rounded-lg border border-emerald-200 bg-emerald-50 px-3.5 text-sm font-semibold text-emerald-700">
            Voted
          </span>
        )}
        {onClose && !readOnly ? (
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-9 items-center rounded-lg border border-slate-300 bg-white px-3.5 text-sm font-semibold text-slate-700 transition hover:border-slate-400 hover:bg-slate-50"
          >
            Close for now
          </button>
        ) : null}
      </div>
    </div>
  );
}
