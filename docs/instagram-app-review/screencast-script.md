# Screencast для App Review — точная раскадровка

Meta требует видео 60-90 секунд, демонстрирующее **end-to-end use case** — как ваше приложение использует каждый запрашиваемый permission. Без этого видео ревью отклоняют автоматически.

## Технические требования

| Параметр | Значение |
|---|---|
| Длительность | **60-90 секунд** (90 — потолок, 60 — оптимум) |
| Формат | MP4, H.264 |
| Разрешение | 1080p или 1440p, **landscape** |
| Размер файла | до 100 MB |
| Звук | Опционально, но **с английскими субтитрами обязательно** (Meta review team глобальная) |
| Где загружать | В Submit-форме App Review, поле «Screencast URL» — нужна публичная ссылка (Loom, YouTube unlisted, Google Drive с доступом по ссылке) |

## Чем записывать

- **Loom** — самый быстрый вариант (free tier: до 5 мин)
- **OBS Studio** — бесплатно, гибко, локальный файл
- **ScreenFlow** (Mac) или **Camtasia** (Win) — если нужен монтаж
- Встроенный QuickTime / Game Bar Win+G — самый простой

## Что готовим перед записью

1. **Окно браузера** на 1920×1080 минимум
2. **Открыты три вкладки**:
   - Tab 1: `https://ordo.uno/ordo-ai-sales/en` — лендинг продукта
   - Tab 2: Instagram Web (https://instagram.com), залогинено под **ordo_business**, открыт чат с **@alkrupych**
   - Tab 3: Vercel Logs Live — `https://vercel.com/aleksandrs-projects-ae098913/lagos-app-crm/logs`
3. **Готовая фраза для DM**: `Привет, нужны наушники для бега бюджет 100$`
4. **Заготовленные субтитры** (см. ниже)

## Раскадровка

### 0:00 — 0:08 (8 сек) — Brand intro
**На экране:** Tab 1 — лендинг `/ordo-ai-sales/en`. Прокрутите hero-секцию.

**Subtitle:** *"Ordo AI Sales Manager — automated AI sales replies for Instagram Business accounts."*

---

### 0:08 — 0:18 (10 сек) — Setup overview
**На экране:** В Tab 1 прокрутите до секции "Configuration Dashboard". Покажите Sheet ID, system prompt поля.

**Subtitle:** *"Merchants connect their Instagram Business account and provide a Google Sheet with their product catalog. The AI uses this catalog as the only source of product knowledge."*

---

### 0:18 — 0:30 (12 сек) — Customer sends a DM
**На экране:** Переключитесь в Tab 2 (Instagram под ordo_business). Клиент пишет сообщение @alkrupych:

```
Привет, нужны наушники для бега бюджет 100$
```

(Translation на subtitle: "Hi, I need headphones for running, budget under $100")

Нажмите Send. Видно как сообщение ушло.

**Subtitle:** *"Customer sends a Direct Message to the connected Instagram Business account asking for headphone recommendations."*

---

### 0:30 — 0:42 (12 сек) — Webhook received + AI processes
**На экране:** Переключитесь на Tab 3 (Vercel Logs). Видно как прилетел POST на `/api/webhooks/instagram` со статусом 200, ниже строки:
```
[ig-webhook] message in { from: '...', text: 'Привет, нужны наушники для бега бюджет 100$' }
[ig-webhook] catalog refreshed { bytes: 11749 }
[ig-webhook] reply sent { to: '...', reply: '...' }
```

**Subtitle:** *"Our backend receives the webhook from Meta, validates the X-Hub-Signature, loads the merchant's catalog from their Google Sheet, and asks Gemini for a contextual reply using only catalog data."*

---

### 0:42 — 0:55 (13 сек) — AI reply arrives in Instagram
**На экране:** Возвращайтесь в Tab 2 (Instagram). Через 2-3 секунды появляется ответ от @alkrupych:

> *«Привет! Для бега в бюджете 100$ рекомендую Sonic Sport V2 ($120) — спортивные TWS с защитой от пота. Или бюджетный Pulse Blast Mini ($89) для строго в бюджет. Что важнее: премиум-звук или цена?»*

**Subtitle:** *"The reply is sent back to the customer through Instagram Graph API and appears in the chat. The AI recommended specific products from the merchant's catalog with prices."*

---

### 0:55 — 1:05 (10 сек) — Closing the sale (доп. сценарий, опционально)
**На экране:** Клиент пишет:

```
Беру Sonic Sport V2 как купить
```

(Translation: "I'll take the Sonic Sport V2, how do I buy?")

Через секунды бот отвечает с **payment link** из колонки «Ссылка оплаты»:

> *«Отличный выбор! Вот ссылка для оплаты Sonic Sport V2: https://pay.example.com/sku/AUD-201»*

**Subtitle:** *"When the customer is ready to buy, the bot sends the payment link directly from the merchant's catalog row, closing the sale inside the chat."*

---

### 1:05 — 1:15 (10 сек) — End screen
**На экране:** Tab 1 (лендинг) — видна секция Pricing.

**Subtitle:** *"Ordo AI Sales Manager — sells, doesn't just reply. ordo.uno/ordo-ai-sales"*

---

**Итого: 1:15 (75 секунд) — оптимально, в окне 60-90.**

## Чеклист перед записью

- [ ] Все три вкладки открыты и залогинены
- [ ] Vercel Logs на Live mode, отфильтровано на последние 5 минут
- [ ] В Instagram чат есть история (чтобы было видно что это реальная беседа, не пустая)
- [ ] Браузер в режиме без notifications/popups (отключить расширения, очистить badge'и)
- [ ] Звук системы выключен (или показывает только то что вы хотите)
- [ ] Если используете Loom — отключите камеру, оставьте только screen capture

## Чеклист после записи

- [ ] Видео в landscape, 1080p+
- [ ] Длительность 60-90 сек
- [ ] Английские субтитры **впечатаны в видео** (лучше чем .srt-файл — Meta review team часто пропускает внешние сабы)
- [ ] Нигде не видно реальных секретов (токены, пароли, App Secret) — если что-то светится в logs/headers, заблюрить или перезаписать
- [ ] Загружено на Loom/YouTube unlisted/Drive с доступом по ссылке
- [ ] Ссылка протестирована в инкогнито (доступна без логина)

## Что Meta хочет увидеть в видео

Из их рекомендаций для review:
1. **Конкретный workflow** — не общие слова про «AI sales», а **точно** показать как customer пишет → как бот отвечает
2. **Где видна работа permission'а** — в нашем случае: видно DM (instagram_business_manage_messages), видно профиль (instagram_business_basic)
3. **Реальные данные** — не «Lorem ipsum», а реальные сообщения и ответы
4. **End-to-end сценарий** — от первого сообщения клиента до результата (рекомендация / payment link)

## Tips, которые ускоряют ревью

- **Запишите дважды:** первый дубль — отрепетировать, второй — финал
- **Не стесняйтесь обрезать паузы** — review-team смотрит много видео в день, чем динамичнее тем лучше
- **Покажите свой реальный продукт**, не stub'ы и заглушки
- **Если что-то не работает в моменте записи** — стоп → починить → перезаписать. Меta видит сразу баги
- **Не озвучивайте голосом** если плохой английский — субтитры всегда лучше акцента
