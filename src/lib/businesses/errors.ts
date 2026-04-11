export const BUSINESS_LIMIT_REACHED_CODE = "BUSINESS_LIMIT_REACHED" as const;

export type BusinessErrorCode =
  | typeof BUSINESS_LIMIT_REACHED_CODE
  | "BUSINESS_CREATE_FAILED"
  | "VALIDATION_ERROR"
  | "UNAUTHORIZED"
  | "INTERNAL_ERROR";

export type BusinessLimitErrorPayload = {
  code: typeof BUSINESS_LIMIT_REACHED_CODE;
  message: string;
  current_usage?: number | null;
  limit?: number | null;
  upgrade_required?: true;
  recommended_plan?: string | null;
  next_limit?: number | null;
};

export type BusinessErrorPayload =
  | BusinessLimitErrorPayload
  | {
      code: Exclude<BusinessErrorCode, typeof BUSINESS_LIMIT_REACHED_CODE>;
      message: string;
    };

export function isBusinessLimitError(
  value: BusinessErrorPayload,
): value is BusinessLimitErrorPayload {
  return value.code === BUSINESS_LIMIT_REACHED_CODE;
}

export function businessLimitReachedError(input?: {
  currentUsage?: number | null;
  limit?: number | null;
  recommendedPlan?: string | null;
  nextLimit?: number | null;
}): BusinessLimitErrorPayload {
  return {
    code: BUSINESS_LIMIT_REACHED_CODE,
    message: "You have reached the maximum number of businesses for your plan",
    current_usage: input?.currentUsage ?? null,
    limit: input?.limit ?? null,
    upgrade_required: true,
    recommended_plan: input?.recommendedPlan ?? null,
    next_limit: input?.nextLimit ?? null,
  };
}
