export const BUSINESS_LIMIT_REACHED_CODE = "BUSINESS_LIMIT_REACHED" as const;

export type BusinessErrorCode =
  | typeof BUSINESS_LIMIT_REACHED_CODE
  | "BUSINESS_CREATE_FAILED"
  | "VALIDATION_ERROR"
  | "UNAUTHORIZED"
  | "INTERNAL_ERROR";

export type BusinessErrorPayload = {
  code: BusinessErrorCode;
  message: string;
  current_usage?: number | null;
  limit?: number | null;
};

export function businessLimitReachedError(input?: {
  currentUsage?: number | null;
  limit?: number | null;
}): BusinessErrorPayload {
  return {
    code: BUSINESS_LIMIT_REACHED_CODE,
    message: "You have reached the maximum number of businesses for your plan",
    current_usage: input?.currentUsage ?? null,
    limit: input?.limit ?? null,
  };
}
