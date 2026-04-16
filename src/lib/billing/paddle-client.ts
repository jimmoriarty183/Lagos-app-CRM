type PaddleMethod = "GET" | "POST" | "PATCH";

export class PaddleApiError extends Error {
  status: number;
  method: PaddleMethod;
  path: string;
  detail: string;

  constructor(input: {
    status: number;
    method: PaddleMethod;
    path: string;
    detail: string;
  }) {
    super(`Paddle API ${input.method} ${input.path} failed: ${input.detail}`);
    this.name = "PaddleApiError";
    this.status = input.status;
    this.method = input.method;
    this.path = input.path;
    this.detail = input.detail;
  }
}

function getPaddleConfig() {
  const apiKey = process.env.PADDLE_API_KEY || "";
  const baseUrl = process.env.PADDLE_API_BASE_URL || "https://api.paddle.com";
  if (!apiKey) {
    throw new Error("Missing PADDLE_API_KEY");
  }
  return { apiKey, baseUrl };
}

async function paddleRequest<T>(
  method: PaddleMethod,
  path: string,
  body?: Record<string, unknown>,
) {
  const { apiKey, baseUrl } = getPaddleConfig();

  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
    cache: "no-store",
  });

  const payload = (await response.json().catch(() => ({}))) as T & {
    error?: { detail?: string; message?: string };
  };

  if (!response.ok) {
    const detail =
      payload?.error?.detail || payload?.error?.message || response.statusText;
    throw new PaddleApiError({
      status: response.status,
      method,
      path,
      detail,
    });
  }

  return payload;
}

export async function paddleGetSubscription(externalSubscriptionId: string) {
  return paddleRequest<Record<string, unknown>>(
    "GET",
    `/subscriptions/${encodeURIComponent(externalSubscriptionId)}`,
  );
}

export async function paddleGetCustomer(paddleCustomerId: string) {
  return paddleRequest<Record<string, unknown>>(
    "GET",
    `/customers/${encodeURIComponent(paddleCustomerId)}`,
  );
}

export async function paddleChangeSubscriptionPlan(input: {
  externalSubscriptionId: string;
  paddlePriceId: string;
  prorationBillingMode?: "prorated_immediately" | "prorated_next_billing_period" | "full_immediately" | "do_not_bill";
}) {
  return paddleRequest<Record<string, unknown>>(
    "PATCH",
    `/subscriptions/${encodeURIComponent(input.externalSubscriptionId)}`,
    {
      items: [{ price_id: input.paddlePriceId, quantity: 1 }],
      proration_billing_mode:
        input.prorationBillingMode ?? "prorated_next_billing_period",
    },
  );
}

export async function paddleCancelSubscription(input: {
  externalSubscriptionId: string;
  effectiveFrom?: "immediately" | "next_billing_period";
}) {
  return paddleRequest<Record<string, unknown>>(
    "POST",
    `/subscriptions/${encodeURIComponent(input.externalSubscriptionId)}/cancel`,
    {
      effective_from: input.effectiveFrom ?? "next_billing_period",
    },
  );
}

export async function paddlePreviewSubscriptionChange(input: {
  externalSubscriptionId: string;
  paddlePriceId: string;
}) {
  return paddleRequest<Record<string, unknown>>(
    "POST",
    `/subscriptions/${encodeURIComponent(input.externalSubscriptionId)}/preview`,
    {
      items: [{ price_id: input.paddlePriceId, quantity: 1 }],
    },
  );
}
