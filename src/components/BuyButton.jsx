'use client';

import { useEffect, useRef } from 'react';

/**
 * BuyButton Component
 * Integrates Paddle payment checkout for Next.js (App Router)
 *
 * Usage:
 * <BuyButton priceId="pri_XXXXX" label="Buy Now" />
 */
export default function BuyButton({
  priceId = 'pri_01h2xcejqy55r61nf5pj194ysa', // Example price ID - replace with your own
  label = 'Buy Now',
  className = '',
  onSuccess = null,
  onError = null,
}) {
  const paddleInitialized = useRef(false);
  const paddleInstanceRef = useRef(null);

  useEffect(() => {
    // Prevent multiple initializations
    if (paddleInitialized.current) return;

    // Initialize Paddle only on client side
    if (typeof window === 'undefined') return;

    const initPaddle = async () => {
      try {
        // Import Paddle loader dynamically on client only to avoid SSR issues.
        const { initializePaddle } = await import('@paddle/paddle-js');

        // Initialize with client token from environment
        const clientToken = process.env.NEXT_PUBLIC_PADDLE_CLIENT_TOKEN;

        if (!clientToken) {
          console.error(
            '[Paddle] Missing NEXT_PUBLIC_PADDLE_CLIENT_TOKEN in environment variables'
          );
          onError?.('Paddle not configured');
          return;
        }

        const paddleInstance = await initializePaddle({
          token: clientToken,
          environment: 'production',
          eventCallback: (event) => {
            // Optional: handle Paddle events
            console.log('[Paddle Event]', event.type, event);
          },
        });

        if (!paddleInstance?.Checkout?.open) {
          console.error('[Paddle] Failed to create Paddle instance');
          onError?.('Paddle failed to initialize');
          return;
        }

        paddleInstanceRef.current = paddleInstance;
        paddleInitialized.current = true;
        console.log('[Paddle] Successfully initialized');
      } catch (error) {
        console.error('[Paddle] Initialization error:', error);
        onError?.(error.message);
      }
    };

    initPaddle();

    // Cleanup is not needed for Paddle - it persists across component unmounts
  }, [onError]);

  /**
   * Handle checkout opening
   * Validates priceId and opens Paddle checkout
   */
  const handleBuyClick = async () => {
    try {
      if (!priceId) {
        console.error('[Paddle] No priceId provided');
        onError?.('Price ID is required');
        return;
      }

      if (!paddleInstanceRef.current?.Checkout?.open) {
        console.error('[Paddle] Checkout unavailable because Paddle is not initialized');
        onError?.('Paddle is still loading');
        return;
      }

      // Open checkout with the price
      await paddleInstanceRef.current.Checkout.open({
        items: [
          {
            priceId: priceId,
            quantity: 1,
          },
        ],
        // Optional: customize checkout behavior
        settings: {
          theme: 'light',
          locale: 'en',
        },
      });

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
    borderRadius: '12px',
    padding: '0 16px',
    fontWeight: 600,
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
          boxShadow: '0 10px 20px -12px rgba(99, 102, 241, 0.72)',
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
