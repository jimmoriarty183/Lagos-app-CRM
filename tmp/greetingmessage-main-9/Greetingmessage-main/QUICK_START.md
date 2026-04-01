# 🚀 Ordo Design System — Quick Start

## Логотип (самое важное!)

### 1. Полный логотип с текстом
```tsx
import { Logo } from "./components/Logo";

<Logo size={48} />
```

### 2. Иконка без текста (для favicon, мобильных меню)
```tsx
import { LogoIcon } from "./components/LogoIcon";

<LogoIcon size={16} />
```

### 3. Favicon (уже готов!)
```html
<!-- Добавь в <head> твоего HTML -->
<link rel="icon" type="image/svg+xml" href="/favicon.svg" />
```

**Файл:** `/public/favicon.svg` ✅

---

## Основные цвета

```tsx
// Primary цвет (приглушенный фиолетовый)
backgroundColor: 'var(--brand-600)'  // #5B5BB3

// Hover состояние
backgroundColor: 'var(--brand-700)'  // #4444A0

// Светлые версии
backgroundColor: 'var(--brand-50)'   // #F7F7FC (очень светлый)
backgroundColor: 'var(--brand-100)'  // #EDEDF9 (светлый)
```

---

## Типографика (шрифт Geist)

```tsx
// Заголовок h1
style={{
  fontSize: '2.25rem',     // 36px
  fontWeight: 600,
  color: 'var(--neutral-900)',
  letterSpacing: '-0.02em'
}}

// Body text
style={{
  fontSize: '1rem',        // 16px
  fontWeight: 400,
  color: 'var(--neutral-700)',
  lineHeight: '1.65'
}}
```

---

## Компоненты

### Кнопка (Primary)
```tsx
<button
  style={{
    backgroundColor: 'var(--brand-600)',
    color: '#FFFFFF',
    padding: '10px 20px',
    borderRadius: 'var(--radius-lg)',  // 10px
    fontWeight: 500,
    border: 'none',
    cursor: 'pointer',
  }}
>
  Click me
</button>
```

### Input
```tsx
<input
  style={{
    border: '1px solid var(--neutral-300)',
    backgroundColor: '#FFFFFF',
    padding: '10px 14px',
    borderRadius: 'var(--radius-lg)',  // 10px
    fontSize: '0.9375rem',
    color: 'var(--neutral-900)',
  }}
/>
```

### Card
```tsx
<div
  style={{
    backgroundColor: '#FFFFFF',
    border: '1px solid var(--neutral-200)',
    borderRadius: '12px',  // rounded-xl
    padding: 'var(--space-6)',  // 24px
    boxShadow: 'var(--shadow-sm)',
  }}
>
  Card content
</div>
```

---

## Иконки (lucide-react)

```tsx
import { Settings, User, Menu } from "lucide-react";

<Settings size={20} color="var(--neutral-600)" />
```

---

## Spacing (используй переменные)

```tsx
padding: 'var(--space-2)'   // 8px
padding: 'var(--space-4)'   // 16px
padding: 'var(--space-6)'   // 24px
padding: 'var(--space-8)'   // 32px
```

---

## ⚠️ Важные правила

1. **Всегда используй `<Logo>` компонент** — не копируй SVG код
2. **Цвет #5B5BB3 приглушенный** — это premium B2B aesthetic
3. **Тонкие borders** — только 1px
4. **Subtle shadows** — `var(--shadow-sm)`, никаких тяжелых теней
5. **Шрифт Geist** — уже подключен глобально

---

## 📖 Полная документация

Смотри `/CODEX_PROMPT.md` для полной документации со всеми деталями, проблемами и решениями.

---

Удачи! 🎨
