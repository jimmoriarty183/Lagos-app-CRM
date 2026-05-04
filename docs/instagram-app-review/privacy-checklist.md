# Privacy & Data Use Checklist

Meta review team всегда **открывает Privacy Policy URL и Data Deletion URL** и проверяет, что там написано конкретно про Instagram-данные. Если страницы общие («мы заботимся о вашей приватности») — review отклоняют с формулировкой «Privacy Policy doesn't address Instagram data use».

Этот чеклист — что должно быть на ваших страницах **именно для прохождения IG App Review**.

## Текущее состояние

| Страница | URL | Статус |
|---|---|---|
| Privacy Policy | https://ordo.uno/privacy | ✅ существует |
| Data Deletion | https://ordo.uno/data-deletion | ✅ существует, отдельный URL (Meta требует именно так) |
| Terms of Service | https://ordo.uno/terms | ✅ существует |

Текущий Privacy ([src/app/privacy/page.tsx](../../src/app/privacy/page.tsx)) — общий, без упоминаний Instagram. Нужно докинуть IG-специфичную секцию.

## Что добавить в /privacy

Вставьте новую секцию **«Instagram and Meta integrations»** между «How we share information» и «Security». Готовый текст (на английском, чтобы Meta review понял):

```markdown
### Instagram and Meta integrations

When a merchant connects their Instagram Business account to Ordo, we
process the following data through the Meta Graph API:

**What we receive from Meta:**
- The merchant's Instagram account id, username, and account_type
  (used to confirm the account is a Business or Creator account, and
  shown back to the merchant in their Ordo dashboard).
- Direct Message (DM) content from customers who message the merchant's
  connected Instagram account.
- Message sender Page-Scoped IDs (PSIDs) — Meta-issued opaque
  identifiers that let us reply to the same conversation.

**What we do with it:**
- DM text is passed to Google's Gemini language model along with the
  merchant's product catalog (provided as a Google Sheet) to generate
  a contextual sales reply.
- The reply is sent back to the customer via the Instagram Graph API
  using the original PSID.
- Webhook delivery logs are retained for 30 days for debugging and
  then deleted.
- PSIDs are kept for the lifetime of the merchant's Ordo subscription
  so we can match returning customers to existing conversations.

**What we do NOT do:**
- We do not store DM content beyond a 30-day rolling debug window.
- We do not sell, share, or rent any Instagram-derived data to third
  parties or advertisers.
- We do not use customer messages to train AI models. Gemini API calls
  are sent with no-training metadata where Google supports it.
- We do not contact customers outside the standard 24-hour customer
  service messaging window opened by their incoming message. We never
  send unsolicited promotional broadcasts.

**How customers opt out:**
- Customers can email support@ordo.uno from the address linked to their
  Instagram account to request deletion of all data we hold tied to
  their PSID. See https://ordo.uno/data-deletion for the full process.
- Merchants can revoke Ordo's access at any time from their Facebook
  account → Apps and Websites. Revocation immediately stops all data
  flow from Meta.
```

## Что добавить в /data-deletion

Текущая страница уже хорошая. Проверьте что она содержит **обязательные элементы для Meta**:

- [x] Конкретный email для запросов: `support@ordo.uno`
- [x] Срок исполнения: **30 days**
- [x] Что именно удаляется (account, messages, OAuth tokens)
- [x] Что может быть retained (billing, security logs) и почему
- [x] Инструкция как отозвать доступ через Facebook → Apps and Websites
- [x] Ссылка на правовую основу (GDPR Art. 17, CCPA)

✅ Это всё уже есть, см. [src/app/data-deletion/page.tsx](../../src/app/data-deletion/page.tsx).

**Опционально докинуть** (для совсем педантичного review-team):

```markdown
### Instagram-specific data deletion

If you previously messaged an Instagram Business account that uses
Ordo and you want to ensure all related data on our side is erased:

1. Email support@ordo.uno from the Instagram account's linked email,
   or include a screenshot of the conversation to identify the PSID.
2. We will:
   - Delete the conversation from our debug logs within 24 hours.
   - Delete the corresponding PSID record within 30 days.
   - Confirm completion by replying to your email.

You can also independently revoke Ordo's access to your Instagram
account from Settings → Apps and Websites → Active → select Ordo AI
Sales Manager → Remove. Note: revocation stops future data sharing
but does not delete past records — please email us as well to request
full deletion.
```

## Что добавить в /terms

Если в Terms нет упоминания, что ваше использование Instagram подчиняется правилам Meta — добавьте короткую секцию:

```markdown
### Third-party services

Ordo integrates with third-party services to provide its functionality.
Use of these integrations is also governed by their respective terms:

- Meta Platforms (Instagram, Facebook): https://www.facebook.com/legal/terms
- Google (Gemini, Sheets): https://policies.google.com/terms
- Paddle (payments): https://www.paddle.com/legal/terms

By using Ordo's Instagram or Facebook integrations, you also agree to
Meta's Platform Terms and Developer Policies.
```

## Чеклист «как Meta это будет проверять»

Перед Submit пройдите вручную:

1. **Открыть https://ordo.uno/privacy в инкогнито** — должна загрузиться без логина, не 404
2. **Найти на странице слово «Instagram»** — Ctrl+F. Если ноль вхождений → сразу отклонят.
3. **Открыть https://ordo.uno/data-deletion в инкогнито** — то же самое, плюс:
4. **Найти `support@ordo.uno`** на data-deletion странице
5. **Найти упоминание срока** (30 days, GDPR, etc.)
6. **Открыть https://ordo.uno/terms** — должна загружаться

## Где Meta проверяет URL'ы

В Meta App Dashboard → **Settings → Basic** — три поля:

| Поле | URL |
|---|---|
| Privacy Policy URL | `https://ordo.uno/privacy` |
| Terms of Service URL | `https://ordo.uno/terms` |
| User data deletion → Data deletion instructions URL | `https://ordo.uno/data-deletion` |

Все три должны быть заполнены и доступны **без редиректов** (`www.ordo.uno → ordo.uno` редиректы могут смутить валидатор — лучше указывать конечный URL без www).

## Деплой изменений в Privacy

После того как доработаете текст в [src/app/privacy/page.tsx](../../src/app/privacy/page.tsx):

```powershell
git add src/app/privacy/page.tsx src/app/terms/page.tsx
git commit -m "docs(legal): add Instagram-specific privacy + terms sections for Meta App Review"
git push
```

Vercel задеплоит автоматически. Проверьте обновление в инкогнито перед Submit.
