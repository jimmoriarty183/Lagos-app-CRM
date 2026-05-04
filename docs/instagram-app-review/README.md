# Instagram App Review — Submission Pack

Полный набор материалов для подачи Ordo AI Sales Manager в Meta App Review, чтобы перейти из Development mode в Live и получать реальные DM webhook'и.

## Файлы в этой папке

| Файл | Что внутри | Когда открывать |
|---|---|---|
| [`business-use-case.md`](./business-use-case.md) | Готовые тексты (на английском) для каждого permission в Submit-форме | Когда заполняете «How will your app use this permission?» |
| [`test-api-calls.md`](./test-api-calls.md) | Чеклист тестовых API-вызовов в Graph API Explorer | Сразу — без них кнопка Submit неактивна |
| [`screencast-script.md`](./screencast-script.md) | Раскадровка 60-90 сек видео с английскими субтитрами | Когда готовы записать demo |
| [`privacy-checklist.md`](./privacy-checklist.md) | Что добавить в /privacy, /data-deletion, /terms специально под IG ревью | Перед Submit — проверьте что страницы соответствуют |

## Порядок действий

### Шаг 0 — предусловия (если не сделаны)
- [ ] App Settings → Basic → все три URL заполнены: Privacy, Terms, Data Deletion
- [ ] App Icon 1024×1024 загружен
- [ ] App Domains содержит `ordo.uno`
- [ ] Category выбрана (Business and Pages)

### Шаг 1 — обновить юр. страницы
- [ ] Открыть [`privacy-checklist.md`](./privacy-checklist.md)
- [ ] Дописать Instagram-секцию в `/privacy` (текст готовый, копируете)
- [ ] Опционально докинуть в `/terms` секцию про third-party services
- [ ] `git push` → проверить в инкогнито что изменения на проде

### Шаг 2 — выполнить test API calls
- [ ] Открыть [`test-api-calls.md`](./test-api-calls.md)
- [ ] Открыть Graph API Explorer
- [ ] Выполнить по очереди все calls для permissions, которые запрашиваете
- [ ] Сделать скриншоты успешных ответов (положить в `screenshots/` рядом с этим README)
- [ ] Вернуться в Use Case page → проверить что `0 of 1 API call(s) required` стало ✅

### Шаг 3 — записать screencast
- [ ] Открыть [`screencast-script.md`](./screencast-script.md)
- [ ] Подготовить три вкладки браузера (лендинг + Instagram + Vercel Logs)
- [ ] Записать 60-90 сек по раскадровке
- [ ] Впечатать английские субтитры в видео
- [ ] Загрузить на Loom unlisted / YouTube unlisted / Drive с открытым доступом
- [ ] Проверить ссылку в инкогнито

### Шаг 4 — заполнить Submit форму
- [ ] Открыть [`business-use-case.md`](./business-use-case.md)
- [ ] Для каждого permission скопировать готовый текст в соответствующее поле
- [ ] Вставить URL на screencast
- [ ] Заполнить Data Use секцию готовыми ответами из use-case файла

### Шаг 5 — Business Verification (если требуется)
Если ваш Meta App владеется Business Manager:
- [ ] Business Manager → Settings → Business Info → Verify Business
- [ ] Загрузить документы (юр. адрес, регистрация бизнеса)
- [ ] Подождать 3-5 дней одобрения
- [ ] **Только после этого** Submit App Review (иначе сразу отклонят)

Если App не привязан к Business Manager — пропускайте.

### Шаг 6 — Submit
- [ ] Финальная проверка: все permission'ы имеют ✅, screencast загружен, тексты вставлены
- [ ] Submit for Review
- [ ] Ждать 1-7 рабочих дней (среднее 2-3)

## Что делать после одобрения

1. **App Mode → Live** в Meta Dashboard (один тогглер)
2. Реальные клиенты пишут @alkrupych → webhook прилетает → Gemini отвечает с каталогом → ответ в DM
3. Можно подключать к боту других мерчантов (каждый со своим Sheet ID — добавить multi-tenant логику в `sales-bot.ts`)

## Если ревью отклонили

1. Прочитать **точный feedback** в письме от Meta (или в App Dashboard → notifications)
2. Поправить **только то**, что они указали (не делать большой re-write)
3. Re-submit — обычно одобряют со второго раза в течение 1-2 дней

Самые частые причины отклонения и их фикс:
- *"Privacy Policy doesn't address Instagram data"* → дописать секцию из [`privacy-checklist.md`](./privacy-checklist.md)
- *"Screencast doesn't demonstrate the use case"* → перезаписать строго по [`screencast-script.md`](./screencast-script.md)
- *"Test API calls don't match permission justification"* → синхронизировать [`test-api-calls.md`](./test-api-calls.md) и тексты в [`business-use-case.md`](./business-use-case.md)
- *"Business Verification required"* → пройти Business Verification, потом re-submit

## Контакты Meta поддержки если застрянете

- **Developer Support Direct:** https://developers.facebook.com/support/
- **App Review FAQ:** https://developers.facebook.com/docs/app-review/
- **Status page:** https://developers.facebook.com/status/dashboard/

## После прохождения ревью — что делать с этой папкой

Можно удалить — артефакты процесса. Или оставить как референс на случай повторной подачи (например, при добавлении новых permissions). Решайте сами.
