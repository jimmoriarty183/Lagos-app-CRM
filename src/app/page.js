// Пример использования BuyButton для Next.js (App Router)
// Разместите этот файл как /app/page.js

'use client';
import BuyButton from '@/components/BuyButton';

export default function HomePage() {
  return (
    <main style={{ padding: 32 }}>
      <h1 style={{ fontSize: 32, marginBottom: 24 }}>Тарифы и оплата</h1>
      {/* Замените priceId на ваш реальный ID из Paddle Dashboard */}
      <BuyButton 
        priceId="pri_01h2xcejqy55r61nf5pj194ysa"
        label="Купить подписку"
        onSuccess={(data) => alert('Оплата прошла успешно!')}
        onError={(err) => alert('Ошибка оплаты: ' + err)}
      />
      <p style={{ marginTop: 24, color: '#888' }}>
        Для теста используйте priceId из вашей панели Paddle.<br />
        Токен берётся из NEXT_PUBLIC_PADDLE_CLIENT_TOKEN (env).
      </p>
    </main>
  );
}
