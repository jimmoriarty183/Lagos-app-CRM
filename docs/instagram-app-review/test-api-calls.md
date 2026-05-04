# Test API Calls Checklist

Meta требует сделать минимум по 1 успешному API-вызову для каждого permission, прежде чем разрешит Submit на App Review. В вашем дашборде это строки `0 of 1 API call(s) required`.

## Где это делается

**Meta App Dashboard → Tools → Graph API Explorer**

Альтернатива (если в новом UI): **Use Case page → "Open Graph API Explorer"** кнопка в разделе тестирования.

## Подготовка (3 минуты)

1. Открыть Graph API Explorer
2. **Application:** выбрать `Ordo AI Sales Manager` (ваш app)
3. **User or Page:** выбрать **Get User Access Token** или использовать существующий **IG Access Token** для alkrupych
4. В поле **Permissions** добавить все нужные permissions:
   - `instagram_business_basic`
   - `instagram_business_manage_messages`
   - `pages_show_list`
   - `business_management` (если запрашиваете)

## Обязательные test calls

### 1. instagram_business_basic

**Method:** GET
**Endpoint:**
```
me?fields=id,username,account_type,user_id
```
**Что должно вернуться:**
```json
{
  "id": "27149540811324264",
  "username": "alkrupych",
  "account_type": "BUSINESS",
  "user_id": "17841401307528587"
}
```
✅ Если это получилось — permission зачлён.

---

### 2. instagram_business_manage_messages

**Этот permission засчитывается двумя API-вызовами:** один на получение/чтение, один на отправку.

#### 2a. Read conversations (для чтения)

**Method:** GET
**Endpoint:**
```
me/conversations?platform=instagram
```
**Что должно вернуться:**
```json
{
  "data": [
    { "id": "...", "updated_time": "..." }
  ]
}
```
Должно быть хотя бы одно (предыдущая беседа alkrupych ↔ ordo_business).

#### 2b. Send a message (для отправки)

**Method:** POST
**Endpoint:**
```
me/messages
```
**Body** (вставьте в поле JSON в Graph API Explorer):
```json
{
  "recipient": { "id": "PSID_ORDO_BUSINESS" },
  "message": { "text": "Test message from API Explorer for App Review" }
}
```

⚠️ Замените `PSID_ORDO_BUSINESS` на реальный PSID. Получить можно так:
- Если уже было входящее сообщение от ordo_business → PSID был в `sender.id` webhook payload (можно посмотреть в Vercel Logs)
- ИЛИ — выполнить шаг 2a выше, взять `id` из data, дёрнуть `GET <conversation_id>?fields=participants` — там увидите PSID

**Что должно вернуться:**
```json
{
  "recipient_id": "...",
  "message_id": "..."
}
```

После выполнения — **в Instagram у ordo_business в DM с alkrupych должно появиться сообщение «Test message from API Explorer for App Review»**.

✅ Если оба запроса (2a + 2b) прошли — permission зачтён.

---

### 3. pages_show_list

**Method:** GET
**Endpoint:**
```
me/accounts
```
**Что должно вернуться:**
```json
{
  "data": [
    { "id": "...", "name": "...", "category": "..." }
  ]
}
```
Если у вас нет Facebook Pages — этот permission **может не понадобиться**. Тогда пропустите и не запрашивайте его при Submit. Меньше permissions = быстрее ревью.

---

### 4. business_management (только если запрашиваете)

**Method:** GET
**Endpoint:**
```
me/businesses
```
**Что должно вернуться:**
```json
{
  "data": [
    { "id": "...", "name": "Aleksandr Krupych Business" }
  ]
}
```

---

## Проверка после test calls

Возвращаетесь в **Use Case page** → должно стать видно:

| Permission | Было | Стало |
|---|---|---|
| `instagram_business_basic` | 0 API test call(s) | ≥1 ✅ |
| `instagram_business_manage_messages` | 0 of 1 API call(s) required | ✅ Required reached |
| `pages_show_list` | 0 API test call(s) | ≥1 ✅ |

Если **0 of 1 API call(s) required** превратилось в **✅** — кнопка Submit станет активной.

## Если test call падает с ошибкой

| Ошибка | Причина | Фикс |
|---|---|---|
| `(#10) Application does not have permission for this action` | Permission ещё не выбран в токене | В Graph API Explorer → Get Token → отметить нужный permission → новый токен |
| `(#100) Invalid parameter` | Неправильный recipient_id или формат body | Сверить с примером выше |
| `(#190) Invalid OAuth access token` | Токен истёк | Сгенерить новый (Get Token) |
| `(#200) Permissions error` | App в Dev mode + у вас нет роли в нём | Убедиться что вы Admin в App Roles |

## Сохраните screenshots

После успеха каждого call — **сделайте screenshot ответа в Graph API Explorer**. Положите в `docs/instagram-app-review/screenshots/`. Если Meta вернёт review с вопросом «покажите как вы используете permission» — пригодятся.
