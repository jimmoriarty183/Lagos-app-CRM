# Адаптация проекта под дизайн-систему Ordo

## Цель
Полностью интегрировать премиальную B2B SaaS дизайн-систему "Ordo" в существующий проект. Стиль: премиум минимализм ("тихая роскошь") — чистый B2B SaaS без шаблонного ощущения, с фокусом на иерархию и ясность, близкий к Stripe, Linear, Notion.

---

## 1. БРЕНДИНГ И ЛОГОТИП

### Основной логотип "Square Grid"
**Концепция:** 2×2 сетка квадратов (два заполненных, два с outline), символизирующая порядок и организацию.

### ⚠️ ВАЖНО: КАК ПРАВИЛЬНО ИСПОЛЬЗОВАТЬ ЛОГОТИП

#### 1. Полный логотип с текстом (для навигации, заголовков)

**Шаг 1:** Импортируй компонент
```tsx
import { Logo } from "./components/Logo";
// Или если ты в другой директории:
import { Logo } from "../components/Logo";
import { Logo } from "../../components/Logo";
```

**Шаг 2:** Используй компонент
```tsx
// По умолчанию (size = 32px, фиолетовый бокс #5B5BB3, белый паттерн)
<Logo />

// Большой размер для hero секций
<Logo size={64} />

// Средний размер для навигации
<Logo size={48} />

// Маленький для компактных мест
<Logo size={24} />

// На темном фоне (белый бокс с фиолетовым паттерном)
<Logo size={48} color="#FFFFFF" />
```

#### 2. Иконка логотипа без текста (для favicon, мобильных меню)

**Шаг 1:** Импортируй компонент
```tsx
import { LogoIcon } from "./components/LogoIcon";
```

**Шаг 2:** Используй компонент
```tsx
// Для favicon и очень маленьких мест
<LogoIcon size={16} />

// Для мобильных меню
<LogoIcon size={24} />

// Для компактных sidebar
<LogoIcon size={32} />
```

#### 3. Favicon (иконка в браузере)

**Файл уже готов:** `/public/favicon.svg`

**Как подключить в HTML:**
```html
<!-- В <head> секции твоего index.html или layout -->
<link rel="icon" type="image/svg+xml" href="/favicon.svg" />
```

Или если используешь React Helmet:
```tsx
import { Helmet } from "react-helmet";

<Helmet>
  <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
  <title>Ordo CRM</title>
</Helmet>
```

### Компоненты логотипа (УЖЕ ГОТОВЫ):

#### Logo (с текстом) — `/src/app/components/Logo.tsx`
```tsx
import { Logo } from "./components/Logo";

// Использование:
<Logo size={32} />                    // По умолчанию (фиолетовый бокс, белый паттерн)
<Logo size={48} color="#5B5BB3" />    // Явно указанный цвет
<Logo size={48} color="#FFFFFF" />    // На темном фоне (белый бокс, фиолетовый паттерн)
```

**Особенность:** Автоматическая инверсия для темного фона - когда `color="#FFFFFF"`, фон становится белым, а паттерн фиолетовым.

#### LogoIcon (только иконка) — `/src/app/components/LogoIcon.tsx`
```tsx
import { LogoIcon } from "./components/LogoIcon";

// Для favicon, мобильных меню, компактных пространств:
<LogoIcon size={16} />                // Маленький
<LogoIcon size={24} />                // Средний
<LogoIcon size={32} color="#FFFFFF" />// На темном фоне
```

#### Favicon — `/public/favicon.svg`
Уже готов! SVG с паттерном Square Grid. Просто подключи его в HTML/React.

### ❌ НЕПРАВИЛЬНО (не делай так):
```tsx
// ❌ Не копируй SVG код напрямую
<svg width="28" height="28">
  <rect x="4" y="4" width="8" height="8" fill="#5B5BB3" />
  ...
</svg>

// ❌ Не создавай свой собственный логотип компонент
export function MyLogo() { ... }
```

### ✅ ПРАВИЛЬНО (делай так):
```tsx
// ✅ Используй готовый компонент Logo
import { Logo } from "../components/Logo";

export function Navigation() {
  return (
    <nav>
      <Logo size={40} />
      {/* остальная навигация */}
    </nav>
  );
}

// ✅ Используй LogoIcon для компактных мест
import { LogoIcon } from "../components/LogoIcon";

export function MobileMenu() {
  return (
    <div>
      <LogoIcon size={24} />
      <span>Menu</span>
    </div>
  );
}
```

### Оригинальный логотип (основа) — `/src/imports/Logo.tsx`
Базовая структура:
- Box: `w-12 h-12` (48px)
- SVG: 28px
- Text: `text-4xl font-bold`
- Цвет: `#5B5BB3`

---

## 2. ЦВЕТОВАЯ ПАЛИТРА

### Brand Colors (Приглушенный фиолетовый)
```css
--brand-50: #F7F7FC;
--brand-100: #EDEDF9;
--brand-200: #DCDCF3;
--brand-300: #C4C4E8;
--brand-400: #A8A8DA;
--brand-500: #7C7CC8;
--brand-600: #5B5BB3;  /* PRIMARY - основной цвет бренда */
--brand-700: #4444A0;
--brand-800: #333387;
--brand-900: #262670;
```

### Neutral Palette (Серая шкала)
```css
--neutral-50: #FAFBFC;   /* Subtle backgrounds */
--neutral-100: #F5F6F7;  /* Light backgrounds */
--neutral-200: #EBEDEF;  /* Borders */
--neutral-300: #DFE1E4;  /* Dividers */
--neutral-400: #B8BCC3;  /* Disabled, placeholders */
--neutral-500: #868C98;  /* Secondary text */
--neutral-600: #5F6672;  /* Body text (medium) */
--neutral-700: #3F4651;  /* Body text (dark) */
--neutral-800: #262B35;  /* Headings (strong) */
--neutral-900: #0F1419;  /* Maximum contrast */
--neutral-950: #080A0D;  /* Pure black alternative */
```

### Semantic Colors
```css
--success-500: #0EA971;
--success-50: #EDFBF5;

--warning-500: #F5A524;
--warning-50: #FEF9ED;

--error-500: #E84545;
--error-50: #FEF2F2;
```

### Системные маппинги (shadcn-compatible)
```css
--background: var(--neutral-50);
--foreground: var(--neutral-900);
--card: #FFFFFF;
--primary: var(--brand-600);
--primary-foreground: #FFFFFF;
--border: var(--neutral-200);
--ring: var(--brand-600);
```

---

## 3. ТИПОГРАФИКА

### Font Family: **Geist**
```css
font-family: 'Geist', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
```

**Импорт шрифтов** (УЖЕ ЕСТЬ в `/src/styles/fonts.css`):
```css
@import url('https://fonts.googleapis.com/css2?family=Geist:wght@300;400;500;600;700&display=swap');
@import url('https://fonts.googleapis.com/css2?family=Geist+Mono:wght@400;500;600&display=swap');
```

### Заголовки (Headings)
```css
/* h1 */
font-size: 2.25rem (36px);
font-weight: 600;
line-height: 1.2;
letter-spacing: -0.02em;
color: var(--neutral-900);

/* h2 */
font-size: 1.875rem (30px);
font-weight: 600;
line-height: 1.3;
letter-spacing: -0.015em;
color: var(--neutral-900);

/* h3 */
font-size: 1.5rem (24px);
font-weight: 600;
line-height: 1.4;
letter-spacing: -0.01em;
color: var(--neutral-900);

/* h4 */
font-size: 1.25rem (20px);
font-weight: 500;
line-height: 1.5;
color: var(--neutral-900);
```

### Body Text
```css
/* Paragraph */
font-size: 1rem (16px);
font-weight: 400;
line-height: 1.65;
color: var(--neutral-700);

/* Label */
font-size: 0.875rem (14px);
font-weight: 500;
line-height: 1.5;
color: var(--neutral-700);

/* Input/Textarea */
font-size: 0.9375rem (15px);
font-weight: 400;
line-height: 1.5;
```

### Monospace (Code)
```css
font-family: 'Geist Mono', 'SF Mono', Monaco, 'Cascadia Code', 'Roboto Mono', monospace;
```

### Font Weights
```css
--font-weight-normal: 400;
--font-weight-medium: 500;
--font-weight-semibold: 600;
```

---

## 4. SPACING SYSTEM

Базовая единица: **4px**

```css
--space-1: 4px;
--space-2: 8px;
--space-3: 12px;
--space-4: 16px;
--space-5: 20px;
--space-6: 24px;
--space-8: 32px;
--space-10: 40px;
--space-12: 48px;
--space-16: 64px;
```

**Использование:**
```tsx
style={{ padding: 'var(--space-6)' }}  // 24px
style={{ marginBottom: 'var(--space-8)' }}  // 32px
```

---

## 5. КОМПОНЕНТЫ И UI PATTERNS

### Border Radius
```css
--radius: 10px;
--radius-sm: 6px;  /* calc(var(--radius) - 4px) */
--radius-md: 8px;  /* calc(var(--radius) - 2px) */
--radius-lg: 10px; /* var(--radius) */
--radius-xl: 14px; /* calc(var(--radius) + 4px) */
```

**Применение:**
- Кнопки и inputs: `rounded-lg` (10px)
- Cards: `rounded-xl` (12px)
- Small elements (badges): `rounded-md` (8px)

### Shadows
```css
--shadow-xs: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
--shadow-sm: 0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px -1px rgba(0, 0, 0, 0.1);
--shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.08), 0 2px 4px -2px rgba(0, 0, 0, 0.05);
--shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.08), 0 4px 6px -4px rgba(0, 0, 0, 0.05);
```

**Subtle shadows** - никогда не используй тяжелые тени!

### Buttons

#### Primary Button
```tsx
style={{
  backgroundColor: 'var(--brand-600)',
  color: '#FFFFFF',
  padding: '10px 20px',
  borderRadius: 'var(--radius-lg)',
  fontWeight: 'var(--font-weight-medium)',
  border: 'none',
  cursor: 'pointer',
}}
// Hover: backgroundColor: 'var(--brand-700)'
```

#### Secondary Button
```tsx
style={{
  backgroundColor: 'transparent',
  border: '1px solid var(--neutral-300)',
  color: 'var(--neutral-700)',
  padding: '10px 20px',
  borderRadius: 'var(--radius-lg)',
  fontWeight: 'var(--font-weight-medium)',
  cursor: 'pointer',
}}
// Hover: backgroundColor: 'var(--neutral-50)'
```

#### Ghost Button
```tsx
style={{
  backgroundColor: 'transparent',
  border: 'none',
  color: 'var(--neutral-600)',
  padding: '10px 20px',
  borderRadius: 'var(--radius-lg)',
  fontWeight: 'var(--font-weight-medium)',
  cursor: 'pointer',
}}
// Hover: backgroundColor: 'var(--neutral-100)'
```

### Forms (Inputs)

#### Text Input
```tsx
style={{
  border: '1px solid var(--neutral-300)',
  backgroundColor: 'var(--input-background)', // #FFFFFF
  padding: '10px 14px',
  borderRadius: 'var(--radius-lg)',
  fontSize: '0.9375rem',
  fontWeight: 'var(--font-weight-normal)',
  color: 'var(--neutral-900)',
}}
// Focus: border: 'var(--brand-600)', outline: '3px solid var(--brand-100)'
// Placeholder: color: 'var(--neutral-400)'
```

#### Textarea
Аналогично input, но с `minHeight: '120px'`

#### Select
```tsx
style={{
  border: '1px solid var(--neutral-300)',
  backgroundColor: '#FFFFFF',
  padding: '10px 14px',
  borderRadius: 'var(--radius-lg)',
  fontSize: '0.9375rem',
  color: 'var(--neutral-900)',
}}
```

### Cards
```tsx
style={{
  backgroundColor: '#FFFFFF',
  border: '1px solid var(--neutral-200)',
  borderRadius: '12px', // rounded-xl
  padding: 'var(--space-6)', // 24px
  boxShadow: 'var(--shadow-sm)',
}}
```

### Badges
```tsx
// Default Badge
style={{
  backgroundColor: 'var(--neutral-100)',
  color: 'var(--neutral-700)',
  padding: '4px 10px',
  borderRadius: 'var(--radius-md)',
  fontSize: '0.75rem',
  fontWeight: 'var(--font-weight-medium)',
  display: 'inline-block',
}}

// Brand Badge
style={{
  backgroundColor: 'var(--brand-100)',
  color: 'var(--brand-700)',
  // остальное аналогично
}}
```

---

## 6. ICONS

**Библиотека:** `lucide-react` (УЖЕ УСТАНОВЛЕНА)

```tsx
import { Settings, User, Search, Menu, X, ChevronRight } from "lucide-react";

// Размеры:
<Settings size={16} />  // Small
<Settings size={20} />  // Medium (default)
<Settings size={24} />  // Large

// Цвет:
<Settings size={20} color="var(--neutral-600)" />
```

**Частые иконки:**
- Navigation: `Menu`, `X`, `ChevronRight`, `ChevronDown`
- Actions: `Plus`, `Edit`, `Trash2`, `Save`, `Download`
- UI: `Search`, `Settings`, `User`, `Bell`, `Mail`
- Status: `Check`, `AlertCircle`, `Info`, `XCircle`

---

## 7. LAYOUT PATTERNS

### Page Container
```tsx
<div style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 2rem' }}>
  {/* content */}
</div>
```

### Sidebar Navigation
```tsx
<aside style={{
  width: '256px', // 16rem
  backgroundColor: '#FFFFFF',
  borderRight: '1px solid var(--neutral-200)',
  height: '100vh',
  position: 'fixed',
}}>
  {/* nav items */}
</aside>
```

### Grid System
```tsx
// 12-column grid
<div style={{
  display: 'grid',
  gridTemplateColumns: 'repeat(12, 1fr)',
  gap: 'var(--space-6)', // 24px
}}>
  {/* items */}
</div>
```

---

## 8. СУЩЕСТВУЮЩИЕ КОМПОНЕНТЫ (УЖЕ В ПРОЕКТЕ)

### Готовые компоненты для использования:
1. **Logo** — `/src/app/components/Logo.tsx`
2. **LogoIcon** — `/src/app/components/LogoIcon.tsx`
3. **Buttons** — `/src/app/components/Buttons.tsx` (examples)
4. **Cards** — `/src/app/components/Cards.tsx` (examples)
5. **Typography** — `/src/app/components/Typography.tsx` (examples)
6. **ColorPalette** — `/src/app/components/ColorPalette.tsx` (examples)
7. **Spacing** — `/src/app/components/Spacing.tsx` (examples)
8. **Icons** — `/src/app/components/Icons.tsx` (examples)
9. **CodeBlock** — `/src/app/components/CodeBlock.tsx` (utility)

### UI библиотека (Radix + shadcn)
В `/src/app/components/ui/` доступны готовые компоненты:
- Accordion, Alert Dialog, Avatar
- Button, Card, Checkbox, Dialog
- Dropdown Menu, Input, Label, Select
- Tabs, Tooltip, Switch
- И многие другие...

**Все UI компоненты уже стилизованы** под дизайн-систему Ordo!

---

## 9. УСТАНОВЛЕННЫЕ ПАКЕТЫ

### UI & Components
- `lucide-react` — иконки
- `@radix-ui/*` — headless UI компоненты
- `@mui/material`, `@mui/icons-material` — Material UI
- `recharts` — графики
- `react-slick` — карусели
- `motion` — анимации (бывший Framer Motion)
- `react-dnd` — drag & drop
- `sonner` — toast notifications
- `cmdk` — command palette
- `vaul` — drawer компонент

### Forms & Validation
- `react-hook-form@7.55.0`
- `input-otp` — OTP inputs

### Utilities
- `clsx`, `tailwind-merge` — className utilities
- `class-variance-authority` — variants
- `date-fns` — date utilities
- `next-themes` — theme switching

---

## ЗАДАЧИ ПО АДАПТАЦИИ

### 🎯 КРИТИЧНО (делать первым)

#### 1. Брендинг
- [ ] Заменить все логотипы на `<Logo>` из `/src/app/components/Logo.tsx`
- [ ] В компактных местах использовать `<LogoIcon>` из `/src/app/components/LogoIcon.tsx`
- [ ] Убедиться что favicon указывает на `/public/favicon.svg`
- [ ] Обновить `<title>` на "Ordo" или "Название проекта | Ordo"
- [ ] Заменить все упоминания старого названия на "Ordo"

#### 2. Основные цвета
- [ ] Заменить все primary/accent цвета на `var(--brand-600)` (#5B5BB3)
- [ ] Hover состояния на `var(--brand-700)`
- [ ] Light версии на `var(--brand-50)`, `var(--brand-100)`
- [ ] Проверить что backgrounds используют `var(--neutral-50)` (#FAFBFC)

#### 3. Типографика
- [ ] Убедиться что везде используется шрифт **Geist**
- [ ] Заголовки (h1-h4) используют правильные размеры и веса
- [ ] Body text использует `color: var(--neutral-700)`
- [ ] Letter-spacing применен к заголовкам (-0.02em для h1, -0.015em для h2)

#### 4. Основные компоненты
- [ ] Обновить все **кнопки** под Primary/Secondary/Ghost стили
- [ ] Обновить все **inputs** и **forms** под стили системы
- [ ] Border: `1px solid var(--neutral-300)`
- [ ] Border-radius: `var(--radius-lg)` (10px)
- [ ] Focus ring: `outline: 3px solid var(--brand-100)`

---

### 🔥 ВАЖНО (делать вторым)

#### 5. Цветовая палитра
- [ ] Все серые заменить на neutral scale (50-950)
- [ ] Success → `var(--success-500)` (#0EA971)
- [ ] Warning → `var(--warning-500)` (#F5A524)
- [ ] Error → `var(--error-500)` (#E84545)
- [ ] Disabled text → `var(--neutral-400)`
- [ ] Secondary text → `var(--neutral-500)`

#### 6. Cards & Containers
- [ ] Background: `#FFFFFF`
- [ ] Border: `1px solid var(--neutral-200)`
- [ ] Border-radius: `12px` (rounded-xl)
- [ ] Shadow: `var(--shadow-sm)` (subtle!)
- [ ] Padding: `var(--space-6)` (24px)

#### 7. Icons
- [ ] Заменить все иконки на `lucide-react`
- [ ] Размеры: 16px (small), 20px (default), 24px (large)
- [ ] Цвет для обычных иконок: `var(--neutral-600)`
- [ ] Цвет для интерактивных: `var(--neutral-700)` → hover `var(--brand-600)`

#### 8. Spacing
- [ ] Использовать переменные `--space-*` вместо хардкодных значений
- [ ] Маленькие gaps: `var(--space-2)` (8px), `var(--space-3)` (12px)
- [ ] Средние: `var(--space-4)` (16px), `var(--space-6)` (24px)
- [ ] Большие: `var(--space-8)` (32px), `var(--space-12)` (48px)

---

### ✨ ПОЛИРОВКА (делать последним)

#### 9. UI детали
- [ ] Border-radius консистентен везде (10px для кнопок/inputs, 12px для cards)
- [ ] Все borders используют `var(--neutral-200)` или `var(--neutral-300)`
- [ ] Shadows только subtle (`var(--shadow-sm)`, `var(--shadow-md)`)
- [ ] Transitions: `transition: all 0.2s ease` для hover/focus

#### 10. Интерактивность
- [ ] Hover эффекты на всех кликабельных элементах
- [ ] `cursor: pointer` на кнопках, ссылках
- [ ] Focus states видимы и используют ring эффект
- [ ] Disabled состояния с `opacity: 0.5` и `cursor: not-allowed`

#### 11. Responsive
- [ ] Mobile: padding `1rem` (16px)
- [ ] Tablet: padding `2rem` (32px)
- [ ] Desktop: padding `4rem` (64px), max-width `1200px`
- [ ] Sidebar: скрывается на mobile, показывается на desktop

#### 12. Loading & Empty States
- [ ] Loading spinners используют `var(--brand-600)`
- [ ] Empty states с subtle иконками из lucide-react
- [ ] Placeholder text: `var(--neutral-400)`

---

## СТИЛЬ И ФИЛОСОФИЯ

### Премиум B2B минимализм ("тихая роскошь")

**Принципы:**
1. **Чистота превыше всего** — много белого пространства
2. **Приглушенные цвета** — никаких ярких, кричащих оттенков
3. **Subtle детали** — тонкие borders, мягкие shadows
4. **Продуманная иерархия** — clear visual hierarchy
5. **Профессионально, но не холодно** — warmth через typography
6. **Enterprise качество** — внимание к деталям

**ИЗБЕГАТЬ:**
- ❌ Яркие saturated цвета
- ❌ Толстые borders (>1px)
- ❌ Тяжелые, deep shadows
- ❌ Излишние украшения, gradients
- ❌ Шаблонный "corporate" вид
- ❌ Перегруженность элементами

**СТРЕМИТЬСЯ К:**
- ✅ Subtle, приглушенные тона
- ✅ Тонкие 1px borders
- ✅ Мягкие, едва заметные тени
- ✅ Минимализм с warmth
- ✅ Премиум, refined aesthetic
- ✅ Generous white space

---

## РЕФЕРЕНСЫ СТИЛЯ

Ориентироваться на эстетику:
- **Stripe** — финтех премиум, clean lines
- **Linear** — современный минимализм, great typography
- **Notion** — чистота и функциональность, subtle UI
- **Vercel** — developer-focused elegance, refined details
- **Raycast** — polished macOS aesthetic, attention to detail

**НЕ ориентироваться:**
- Старые enterprise CRM (Salesforce, Oracle)
- Шаблонные admin dashboards
- Яркие consumer products

---

## КАК ИСПОЛЬЗОВАТЬ ЭТОТ ПРОМПТ

1. **Начни с брендинга**: Логотип, favicon, цвет brand-600
2. **Типографика**: Geist font, правильные размеры
3. **Цвета**: Замени все на palette из `:root`
4. **Компоненты**: Систематически пройдись по кнопкам, формам, cards
5. **Детали**: Spacing, borders, shadows, icons
6. **Полировка**: Transitions, responsive, edge cases

**ВАЖНО:**
- Используй CSS переменные (`var(--*)`) для консистентности
- Импортируй готовые компоненты из `/src/app/components/`
- Проверяй `/src/styles/theme.css` для всех токенов
- Шрифт: **Geist**, не system fonts!
- Border-radius: **10px** (buttons/inputs), **12px** (cards)

---

## ФАЙЛЫ ДЛЯ РЕФЕРЕНСА

### Стили:
- `/src/styles/theme.css` — все CSS переменные
- `/src/styles/fonts.css` — импорты Geist
- `/src/styles/tailwind.css` — Tailwind v4 config

### Компоненты:
- `/src/app/components/Logo.tsx` — основной логотип
- `/src/app/components/LogoIcon.tsx` — иконка логотипа
- `/src/app/components/ui/*` — UI библиотека (Radix)

### Assets:
- `/public/favicon.svg` — SVG favicon
- `/src/imports/Logo.tsx` — оригинальный логотип (база)

### Примеры:
- `/src/app/pages/Typography.tsx` — примеры типографики
- `/src/app/pages/Colors.tsx` — палитра цветов
- `/src/app/pages/Buttons.tsx` — примеры кнопок
- `/src/app/pages/Forms.tsx` — примеры форм
- `/src/app/pages/Components.tsx` — UI elements

---

## КОНТРОЛЬНЫЙ СПИСОК

После адаптации, убедись что:

- [ ] Все логотипы используют `<Logo>` или `<LogoIcon>`
- [ ] Favicon = `/public/favicon.svg`
- [ ] Primary color везде `#5B5BB3`
- [ ] Шрифт **Geist** применен глобально
- [ ] Все серые используют neutral palette
- [ ] Кнопки следуют 3 стилям (Primary/Secondary/Ghost)
- [ ] Inputs имеют правильные borders и focus states
- [ ] Cards с subtle shadows и rounded-xl
- [ ] Иконки из `lucide-react`
- [ ] Spacing через `var(--space-*)` переменные
- [ ] Border-radius консистентен (10px/12px)
- [ ] Нет ярких, кричащих цветов
- [ ] Только subtle shadows
- [ ] Много белого пространства
- [ ] Responsive на всех экранах
- [ ] Hover/focus states работают
- [ ] Premиум B2B aesthetic достигнут

---

## ❓ ЧАСТЫЕ ПРОБЛЕМЫ И РЕШЕНИЯ

### Проблема 1: "Не могу сделать фавикон"

**Решение:** Favicon уже готов в файле `/public/favicon.svg`. Просто подключи его в HTML:

```html
<!-- В index.html или твоем HTML layout -->
<!DOCTYPE html>
<html>
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
    <title>Ordo CRM</title>
  </head>
  <body>
    <div id="root"></div>
  </body>
</html>
```

Или через React Helmet/Next.js:
```tsx
// React Helmet
import { Helmet } from "react-helmet";

function App() {
  return (
    <>
      <Helmet>
        <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
        <title>Ordo CRM</title>
      </Helmet>
      {/* rest of app */}
    </>
  );
}

// Next.js (в _app.tsx или layout.tsx)
import Head from "next/head";

export default function MyApp({ Component, pageProps }) {
  return (
    <>
      <Head>
        <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
        <title>Ordo CRM</title>
      </Head>
      <Component {...pageProps} />
    </>
  );
}
```

### Проблема 2: "Не могу сделать логотип"

**Решение:** НЕ создавай логотип с нуля! Используй готовые компоненты:

```tsx
// ✅ ПРАВИЛЬНО - полный логотип с текстом
import { Logo } from "./components/Logo";

function Header() {
  return (
    <header>
      <Logo size={40} />
    </header>
  );
}

// ✅ ПРАВИЛЬНО - иконка без текста
import { LogoIcon } from "./components/LogoIcon";

function Sidebar() {
  return (
    <aside>
      <LogoIcon size={24} />
    </aside>
  );
}

// ❌ НЕПРАВИЛЬНО - копирование SVG кода
function MyLogo() {
  return (
    <svg width="28" height="28">
      <rect x="4" y="4" width="8" height="8" fill="#5B5BB3" />
      {/* ... НЕ ДЕЛАЙ ТАК! */}
    </svg>
  );
}
```

### Проблема 3: "Логотип отображается неправильно в Overview"

**Решение:** На странице Overview должен быть импортирован и использован компонент `<Logo>`:

```tsx
// В /src/app/pages/Overview.tsx
import { Logo } from "../components/Logo";

export default function Overview() {
  return (
    <div>
      {/* Показываем большой логотип в начале */}
      <div className="mb-12 flex justify-center">
        <Logo size={64} />
      </div>
      
      <h1>Ordo Design System</h1>
      {/* остальной контент */}
    </div>
  );
}
```

### Проблема 4: "Где взять правильный путь для импорта?"

**Решение:** Зависит от того, где находится твой файл:

```tsx
// Если твой файл в /src/app/pages/MyPage.tsx
import { Logo } from "../components/Logo";

// Если твой файл в /src/app/components/MyComponent.tsx
import { Logo } from "./Logo";

// Если твой файл в /src/app/nested/folder/MyComponent.tsx
import { Logo } from "../../components/Logo";

// Общее правило:
// ../ = вверх на один уровень
// ../../ = вверх на два уровня
// ./ = текущая директория
```

### Проблема 5: "Компонент Logo не найден"

**Проверь:**
1. Файл существует: `/src/app/components/Logo.tsx` ✅
2. Правильный путь импорта (см. Проблему 4)
3. Экспорт в файле `Logo.tsx`:
```tsx
export function Logo({ size = 32, color }: { size?: number; color?: string }) {
  // ... код компонента
}
```

### Проблема 6: "Цвет логотипа слишком яркий"

**Это не проблема!** Цвет `#5B5BB3` специально **приглушенный** (muted), а не яркий. Это премиум B2B aesthetic. Если кажется ярким, проверь:
- Калибровку монитора
- Контраст с фоном (должен быть белый #FFFFFF или светлый var(--neutral-50))

### Проблема 7: "Favicon не меняется в браузере"

**Решение:** Очисти кеш браузера:
- Chrome: Ctrl+Shift+Delete → "Изображения и другие файлы"
- Firefox: Ctrl+Shift+Delete → "Кеш"
- Safari: Command+Option+E
- Или открой в режиме инкогнито для проверки

### Проблема 8: "Как использовать логотип на темном фоне?"

**Решение:** Передай `color="#FFFFFF"` в пропс:

```tsx
// На светлом фоне (по умолчанию)
<Logo size={48} />
// Фиолетовый бокс #5B5BB3 с белым паттерном

// На темном фоне
<Logo size={48} color="#FFFFFF" />
// Белый бокс с фиолетовым паттерном (автоинверсия)

// Пример с темной секцией
<div style={{ backgroundColor: "#0F1117", padding: "2rem" }}>
  <Logo size={48} color="#FFFFFF" />
</div>
```

---

Удачи! 🚀 Создай премиальный B2B SaaS продукт с "тихой роскошью" Ordo.