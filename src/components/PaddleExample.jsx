'use client';

import BuyButton from './BuyButton';

/**
 * Paddle Payment Example Component
 * Shows different ways to integrate Paddle checkout
 */
export default function PaddleExample() {
  const handlePaymentSuccess = (data) => {
    console.log('✓ Payment successful!', data);
    // Handle success - redirect, show message, etc.
  };

  const handlePaymentError = (error) => {
    console.error('✗ Payment error:', error);
    // Handle error - show toast, message, etc.
  };

  return (
    <div className="w-full max-w-4xl mx-auto px-6 py-12">
      {/* Header */}
      <div className="mb-12 text-center">
        <h1 className="text-4xl font-bold mb-4">Paddle Integration Example</h1>
        <p className="text-gray-600 dark:text-white/70 mb-8">
          Click any button below to open Paddle checkout
        </p>
      </div>

      {/* Basic Buy Buttons */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
        {/* Example 1: Basic Button */}
        <div className="p-6 border border-gray-200 dark:border-white/10 rounded-lg">
          <h2 className="text-xl font-semibold mb-4">Basic Plan</h2>
          <p className="text-gray-600 dark:text-white/70 mb-6">$29/month</p>
          <BuyButton
            priceId="pri_01h2xcejqy55r61nf5pj194ysa"
            label="Buy Basic"
            onSuccess={handlePaymentSuccess}
            onError={handlePaymentError}
          />
        </div>

        {/* Example 2: Premium Button */}
        <div className="p-6 border border-gray-200 dark:border-white/10 rounded-lg">
          <h2 className="text-xl font-semibold mb-4">Premium Plan</h2>
          <p className="text-gray-600 dark:text-white/70 mb-6">$99/month</p>
          <BuyButton
            priceId="pri_01h2xcejqy55r61nf5pj194ysb"
            label="Buy Premium"
            className="bg-emerald-600 hover:bg-emerald-700"
            onSuccess={handlePaymentSuccess}
            onError={handlePaymentError}
          />
        </div>
      </div>

      {/* Information Section */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mt-12">
        <h3 className="text-lg font-semibold mb-4">Setup Instructions</h3>
        <ol className="list-decimal list-inside space-y-3 text-gray-700 dark:text-white/80">
          <li>
            Add this to your <code className="bg-gray-200 px-2 py-1 rounded">.env.local</code>:
            <pre className="bg-gray-800 text-gray-100 p-3 rounded mt-2 overflow-x-auto">
NEXT_PUBLIC_PADDLE_CLIENT_TOKEN=live_19089f4a8d8f97fb3bf312787e1
            </pre>
          </li>
          <li>Replace the price IDs with your actual Paddle price IDs</li>
          <li>Import BuyButton in your components</li>
          <li>Click any button to open the Paddle checkout</li>
        </ol>
      </div>

      {/* Important Notes */}
      <div className="mt-8 p-6 bg-yellow-50 border border-yellow-200 rounded-lg">
        <h3 className="font-semibold text-yellow-900 mb-3">⚠️ Important Notes:</h3>
        <ul className="list-disc list-inside space-y-2 text-yellow-800 text-sm">
          <li>Always use NEXT_PUBLIC_ prefix for client-side tokens</li>
          <li>Never commit actual tokens to git - use .env.local</li>
          <li>The token in this file is an example - replace with your own</li>
          <li>Payments will not process without a valid token</li>
          <li>In development, you may need to use 'sandbox' environment</li>
        </ul>
      </div>
    </div>
  );
}
