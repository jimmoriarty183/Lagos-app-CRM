import type { JSX } from "react";

export function openCheckout(priceId?: string): Promise<boolean>;

declare const BuyButton: (props: {
  priceId?: string;
  label?: string;
  className?: string;
  onSuccess?: ((payload: { priceId?: string }) => void) | null;
  onError?: ((message: string) => void) | null;
}) => JSX.Element;

export default BuyButton;
