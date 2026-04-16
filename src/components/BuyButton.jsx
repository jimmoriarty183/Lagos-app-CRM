'use client';

import { useEffect } from 'react';
import { initializePaddle } from '@paddle/paddle-js';

// Global Paddle instance + init promise (shared across all buttons/components)
let paddle = null;
let paddleInitPromise = null;

const PADDLE_CLIENT_TOKEN =
  process.env.NEXT_PUBLIC_PADDLE_CLIENT_TOKEN || 'REPLACE_WITH_CLIENT_TOKEN';
const PADDLE_ENVIRONMENT =
  process.env.NEXT_PUBLIC_PADDLE_ENVIRONMENT || 'sandbox';
const FALLBACK_PRICE_ID = 'REPLACE_WITH_PRICE_ID';

async function initPaddle() {
  if (typeof window === 'undefined') return null;
  if (paddle) return paddle;

  if (!paddleInitPromise) {
    if (
      !PADDLE_CLIENT_TOKEN ||
      PADDLE_CLIENT_TOKEN === 'REPLACE_WITH_CLIENT_TOKEN'
    ) {
      console.error(
        '[Paddle] Missing client token. Set NEXT_PUBLIC_PADDLE_CLIENT_TOKEN in .env.local'
      );
      return null;
    }

    paddleInitPromise = initializePaddle({
      environment: PADDLE_ENVIRONMENT,
      token: PADDLE_CLIENT_TOKEN,
      eventCallback: (event) => {
        if (!event) return;
        const name = event?.name || 'unknown';
        if (name.toLowerCase().includes('error')) {
          console.error('[Paddle] Event error:', event);
        } else {
          console.log('[Paddle] Event:', name);
        }
      },
    })
      .then((instance) => {
        if (!instance?.Checkout?.open) {
          console.error('[Paddle] Initialization failed: Checkout.open unavailable');
          return null;
        }
        paddle = instance;
        console.log(`[Paddle] Initialized (${PADDLE_ENVIRONMENT})`);
        return paddle;
      })
      .catch((error) => {
        console.error('[Paddle] Initialization error:', error);
        return null;
      })
      .finally(() => {
        // Allow retry if init failed and paddle is still null.
        if (!paddle) paddleInitPromise = null;
      });
  }

  return paddleInitPromise;
}

export async function openCheckout(priceId = FALLBACK_PRICE_ID, options = {}) {
  if (typeof window === 'undefined') {
    console.error('[Paddle] Checkout can only be opened in browser');
    return false;
  }

  if (!priceId || priceId === FALLBACK_PRICE_ID) {
    console.error(
      '[Paddle] Invalid priceId. Provide real price id instead of placeholder.'
    );
    return false;
  }

  const instance = paddle || (await initPaddle());
  if (!instance?.Checkout?.open) {
    console.error('[Paddle] Paddle not initialized');
    return false;
  }

  try {
    const customerEmail = String(options.customerEmail || '').trim();
    const customData =
      options.customData && typeof options.customData === 'object'
        ? options.customData
        : undefined;
    const successUrl = String(options.successUrl || '').trim();

    await instance.Checkout.open({
      items: [
        {
          priceId: priceId || FALLBACK_PRICE_ID,
          quantity: 1,
        },
      ],
      customer: customerEmail ? { email: customerEmail } : undefined,
      customData,
      successUrl: successUrl || undefined,
    });
    return true;
  } catch (error) {
    console.error('[Paddle] Checkout error:', {
      environment: PADDLE_ENVIRONMENT,
      priceId,
      tokenSet:
        Boolean(PADDLE_CLIENT_TOKEN) &&
        PADDLE_CLIENT_TOKEN !== 'REPLACE_WITH_CLIENT_TOKEN',
      error,
    });
    return false;
  }
}

/**
 * BuyButton Component
 * Integrates Paddle payment checkout for Next.js (App Router)
 *
 * Usage:
 * <BuyButton priceId="pri_XXXXX" label="Buy Now" />
 */
export default function BuyButton({
  priceId = FALLBACK_PRICE_ID,
  label = 'Buy Now',
  className = '',
  redirectTo = '',
  onSuccess = null,
  onError = null,
}) {
  useEffect(() => {
    void initPaddle();
  }, [onError]);

  /**
   * Handle checkout opening
   * Validates priceId and opens Paddle checkout
   */
  const handleBuyClick = async () => {
    try {
      const href = String(redirectTo || '').trim();
      if (href) {
        window.location.href = href;
        return;
      }

      if (!priceId) {
        console.error('[Paddle] No priceId provided');
        onError?.('Price ID is required');
        return;
      }

      const opened = await openCheckout(priceId);
      if (!opened) {
        onError?.('Paddle is still loading');
        return;
      }

      // Success callback can be handled here if needed
      onSuccess?.({ priceId });
    } catch (error) {
      console.error('[Paddle] Checkout error:', error);
      onError?.(error.message || 'Failed to open checkout');
    }
  };

  // Кнопка всегда повторяет фирменный стиль сайта
  const classTokens = className.trim().split(/\s+/).filter(Boolean);
  const hasPrimaryClass = classTokens.includes('primary');
  const hasSecondaryClass = classTokens.includes('secondary');
  const resolvedVariant = hasSecondaryClass ? 'secondary' : 'primary';
  const resolvedClassName =
    className && (hasPrimaryClass || hasSecondaryClass)
      ? className
      : className
        ? `${className} ${resolvedVariant}`
        : resolvedVariant;

  const baseStyle = {
    borderRadius: 'var(--radius)',
    padding: 'var(--space-3) var(--space-6)',
    fontWeight: 500,
    height: '42px',
    cursor: 'pointer',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
  };

  const variantStyle =
    resolvedVariant === 'secondary'
      ? {
          border: '1px solid #c7d7eb',
          background: '#fff',
          color: '#0f172a',
          boxShadow: 'none',
        }
      : {
          border: '1px solid var(--brand-600)',
          background: 'var(--brand-600)',
          color: 'white',
          boxShadow: 'none',
        };

  return (
    <button
      onClick={handleBuyClick}
      className={resolvedClassName}
      type="button"
      aria-label={label}
      style={{ ...baseStyle, ...variantStyle }}
    >
      {label}
    </button>
  );
}
