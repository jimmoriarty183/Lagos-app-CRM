"use client";

import { useMemo, useState } from "react";
import type { Survey } from "@/lib/campaigns/types";

type SurveyAnswersState = Record<string, string[]>;

type Props = {
  survey: Survey;
  onSubmitted: () => void;
};

function QuestionBlock({
  question,
  value,
  onChange,
}: {
  question: Survey["questions"][number];
  value: string[];
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
    <div className="rounded-xl border border-slate-200 bg-white p-3">
      <div className="text-sm font-semibold text-slate-900">{question.title}</div>
      <div className="mt-2 flex flex-wrap gap-2">
        {question.options.map((option) => {
          const selected = value.includes(option.id);
          return (
            <button
              key={option.id}
              type="button"
              onClick={() => toggle(option.id)}
              className={[
                "rounded-lg border px-3 py-1.5 text-sm transition",
                selected
                  ? "border-indigo-300 bg-indigo-50 text-indigo-800"
                  : "border-slate-200 bg-white text-slate-700 hover:border-slate-300",
              ].join(" ")}
            >
              {option.label}
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

export function SurveyForm({ survey, onSubmitted }: Props) {
  const [answers, setAnswers] = useState<SurveyAnswersState>({});
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const isComplete = useMemo(() => {
    return survey.questions.every((question) => (answers[question.id]?.length ?? 0) > 0);
  }, [answers, survey.questions]);

  const handleSubmit = async () => {
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
    const json = await safeJson<{ ok: boolean; error?: string }>(response);

    if (!response.ok || !json?.ok) {
      setError(json?.error ?? "Failed to submit survey");
      setSubmitting(false);
      return;
    }

    setSuccess(true);
    setSubmitting(false);
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
      {survey.questions.map((question) => (
        <QuestionBlock
          key={question.id}
          question={question}
          value={answers[question.id] ?? []}
          onChange={(next) => setAnswers((current) => ({ ...current, [question.id]: next }))}
        />
      ))}
      {error ? (
        <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-600">{error}</div>
      ) : null}
      <button
        type="button"
        onClick={handleSubmit}
        disabled={submitting}
        className="inline-flex h-10 items-center rounded-lg bg-indigo-600 px-4 text-sm font-semibold text-white transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {submitting ? "Submitting..." : "Submit answers"}
      </button>
    </div>
  );
}

