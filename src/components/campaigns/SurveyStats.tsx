import type { SurveyStats as SurveyStatsType } from "@/lib/campaigns/types";

type Props = {
  stats: SurveyStatsType;
};

export function SurveyStats({ stats }: Props) {
  if (stats.questions.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-slate-300 dark:border-white/15 bg-slate-50 dark:bg-white/[0.04] px-4 py-8 text-center text-sm text-slate-500 dark:text-white/55">
        Survey has no questions
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {stats.questions.map((question) => (
        <div key={question.id} className="rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/[0.03] p-4">
          <div className="text-sm font-semibold text-slate-900 dark:text-white">{question.title}</div>
          <div className="mt-1 text-xs uppercase tracking-[0.1em] text-slate-500 dark:text-white/55">
            {question.questionType} • {question.totalResponses} total responses
          </div>
          <div className="mt-3 space-y-2">
            {question.options.map((option) => (
              <div key={option.id} className="rounded-lg border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.04] px-3 py-2">
                <div className="flex items-center justify-between gap-3 text-sm">
                  <span className="text-slate-700 dark:text-white/80">{option.label}</span>
                  <span className="font-semibold text-slate-900 dark:text-white">{option.responsesCount}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

