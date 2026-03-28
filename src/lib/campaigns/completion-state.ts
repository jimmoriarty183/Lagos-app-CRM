type CompletionSources = {
  surveyCompletedAt: string | null;
  latestSurveyResponseAt: string | null;
  latestCompletedEventAt: string | null;
  isCompletedFlag: boolean;
};

export function resolveCampaignCompletionState(sources: CompletionSources) {
  const effectiveCompletedAt =
    sources.surveyCompletedAt ??
    sources.latestSurveyResponseAt ??
    sources.latestCompletedEventAt ??
    null;

  return {
    isCompleted: Boolean(effectiveCompletedAt) || sources.isCompletedFlag,
    effectiveCompletedAt,
  };
}
