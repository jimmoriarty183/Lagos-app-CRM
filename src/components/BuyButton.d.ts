import type { JSX } from "react";

export interface OpenCheckoutOptions {
  customerEmail?: string;
  customData?: Record<string, unknown>;
  successUrl?: string;
}

export function openCheckout(
  priceId?: string,
  options?: OpenCheckoutOptions,
): Promise<boolean>;

declare const BuyButton: (props: {
  priceId?: string;
  label?: string;
  className?: string;
  redirectTo?: string;
  onSuccess?: ((payload: { priceId?: string }) => void) | null;
  onError?: ((message: string) => void) | null;
}) => JSX.Element;

export default BuyButton;
