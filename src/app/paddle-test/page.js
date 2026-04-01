// Тестовая страница для демонстрации BuyButton
'use client';
import BuyButton from '@/components/BuyButton';

export default function Page() {
  return (
    <div style={{ padding: 32 }}>
      <h1>Тест Paddle оплаты</h1>
      {/* Замените priceId на ваш актуальный из Paddle Dashboard */}
      <BuyButton priceId="pri_ВАШ_ID_ОТСЮДА" label="Купить подписку" />
    </div>
  );
}
