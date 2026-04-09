# 🐳 Як заповнити БД демо-даними

Скрипт тепер готовий! У вас є два файли:

1. **`demo-seed-data.sql`** — Старо версія з міграціями (конфлікт з існуючою структурою)
2. **`demo-seed-data-EXECUTE-ONLY.sql`** ← **ВИКОРИСТОВУЙТЕ ЦЕЙ**

## 📋 Що містить demo-seed-data:

✅ **5 реалістичних клієнтів**

- TechVision Solutions (B2B)
- Lagos Logistics Hub (B2B)
- Engr. Chioma Okonkwo (фізична особа)
- Rapid Manufacturing (B2B)
- Smart Supply Chain (B2B)

✅ **12 промислових товарів**

- PLC контролери, UPS, мережеві комутатори
- Серверні SSD, електромотори, датчики
- Гідравлічні насоси, кабельні комплекти
- Всі з реалістичними ціноми в NGN

✅ **5 послуг**

- Інсталяція систем
- Річне обслуговування
- Технічні консультації
- Навчання персоналу
- 24/7 підтримка

✅ **2 склади** з запасами товарів

✅ **3 закази в різних статусах**

- ORD-2026-001: DRAFT (новий)
- ORD-2026-002: CONFIRMED (підтверджений)
- ORD-2026-003: COMPLETED (виконаний)

✅ **5+ service requests** (запити на обслуговування)

- IN_PROGRESS, SCHEDULED, COMPLETED статуси
- Реалістичні SLA дати

✅ **Коментарі & активність**

- Календар подій замовлень
- Записи про покроковий прогрес
- Аналітичні дані

---

## 🚀 Як застосувати скрипт

### Опція 1: Supabase Dashboard (найпростіше)

1. Перейдіть на https://app.supabase.com
2. Виберіть ваш проект
3. Перейдіть у **SQL Editor**
4. Натисніть **"New Query"**
5. Скопіюйте весь вміст `supabase/sql/demo-seed-data-EXECUTE-ONLY.sql`
6. Вставте у редактор
7. Натисніть **"Execute"**
8. Дочекайтесь завершення ✓

Результат: На екрані CRM будуть видні 5 клієнтів, 3 закази, послуги, коментарії.

### Опція 2: Через CLI (якщо хочете автоматизувати)

```bash
cd d:\lagos-mvp
# Просто скопіюйте вміст файлу та вставте в SQL Editor выше
```

### Опція 3: Via psql (якщо встановлений)

```bash
psql -h db.troxchcultqcjelexherrc.supabase.co -U postgres -d postgres < supabase/sql/demo-seed-data-EXECUTE-ONLY.sql
```

(Замініть хост і користувача на ваш Supabase URL)

---

## ✨ Що буде видно в інтерфейсі

**Orders Page:**

- Список 3 заказів з різними статусами
- Кількість позицій (line items) в кожному
- Суми з послугами і товарами
- Дати замовлення

**Customers:**

- 5 клієнтів
- Контактна інформація (email, телефон) -税 ID для компаній

**Products & Services:**

- 12 товарів з цінами
- 5 послуг з часовими ставками
- SKU коди для продукції

**Service Requests:**

- 3 запити на обслуговування
- Статуси (IN_PROGRESS, SCHEDULED, COMPLETED)
- SLA дати
- Примітки про завершення

**Activity Feed:**

- Коментарі менеджерів про закази
- Історія статусів
- Часові мітки подій

**Inventory:**

- Остатки товарів на складах
- Доступна кількість для кожного SKU

---

## 🔍 Порядку перевірти де додані дані

Запустіть ці запити в SQL Editor, щоб переконатися в результатах:

**Замовлення:**

```sql
SELECT order_no, status, total_amount, COUNT(*) OVER (PARTITION BY order_id) as line_count
FROM public.orders o
LEFT JOIN public.order_lines ol ON o.id = ol.order_id
ORDER BY o.order_date DESC;
```

**Service Requests:**

```sql
SELECT request_no, status, priority, customer_id, planned_start_at
FROM public.service_requests
ORDER BY created_at DESC;
```

**Коментарі:**

```sql
SELECT entity_id, body, created_at
FROM public.comments
WHERE deleted_at IS NULL
ORDER BY created_at DESC
LIMIT 10;
```

---

## ⚠️ Важливо!

- Скрипт **ідемпотентний** – можна запускати кілька разів без дублювання
- Використовуються `ON CONFLICT ... DO NOTHING/UPDATE` для безпеки
- business_id в коментарях/активності: `550e8400-e29b-41d4-a716-446655440000`
  - Якщо у вас інший business_id, замініть це значення на ваше

---

## 📊 Аналітичні запити для дашборду

Після заповнення БД, ви можете використовувати такі запити:

**Top Customers by Value:**

```sql
SELECT c.name, SUM(o.total_amount) as order_value, COUNT(o.id) as order_count
FROM public.orders o
JOIN public.customers c ON o.customer_id = c.id
GROUP BY c.id, c.name
ORDER BY order_value DESC;
```

**Service Requests SLA Status:**

```sql
SELECT
  status,
  COUNT(*) as count,
  NOW() > sla_due_at as overdue
FROM public.service_requests
WHERE sla_due_at IS NOT NULL
GROUP BY status, overdue;
```

**Inventory Alert:**

```sql
SELECT p.name, w.name as warehouse, ib.available_qty
FROM public.inventory_balances ib
JOIN public.catalog_products p ON ib.product_id = p.id
JOIN public.warehouses w ON ib.warehouse_id = w.id
WHERE ib.available_qty < 5
ORDER BY available_qty;
```

---

## 🆘 Якщо щось не спрацює

1. Помилка `table does not exist` → Міграції не застосовані. Запустіть `supabase db push` спочатку
2. Помилка `column does not exist` → Схема відрізняється. Розповідьте яке повідомлення про помилку
3. Дані не видно → Оновіть сторінку CRM (F5)

---

**Готово! 🎉 Ваша demo-БД повинна бути наповнена якісними даними для демонстрації та тестування.**
