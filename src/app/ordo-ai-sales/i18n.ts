export type Locale = "en" | "uk" | "ru";

export const SUPPORTED_LOCALES: Locale[] = ["en", "uk", "ru"];

export const localeMeta: Record<Locale, { label: string; short: string }> = {
  en: { label: "English", short: "EN" },
  uk: { label: "Українська", short: "UA" },
  ru: { label: "Русский", short: "RU" },
};

export type Dictionary = {
  nav: {
    features: string;
    demo: string;
    dashboard: string;
    pricing: string;
    signIn: string;
    cta: string;
  };
  hero: {
    eyebrow: string;
    titleLine1: string;
    titleLine2Highlight: string;
    titleLine3: string;
    subtitle: string;
    primaryCta: string;
    secondaryCta: string;
    badges: string[];
  };
  features: {
    eyebrow: string;
    title: string;
    titleAccent: string;
    items: { title: string; body: string; iconKey: FeatureIconKey }[];
  };
  demo: {
    eyebrow: string;
    title: string;
    subtitle: string;
    aiName: string;
    placeholder: string;
    sendLabel: string;
    suggestionsLabel: string;
    suggestions: string[];
    /** Scripted replies, indexed by suggestion position */
    replies: DemoReply[];
    catalogLabel: string;
    payLinkLabel: string;
    payLinkCta: string;
    typing: string;
    productPriceLabel: string;
    initialAiMessage: string;
  };
  config: {
    eyebrow: string;
    title: string;
    subtitle: string;
    sheetIdLabel: string;
    sheetIdHelp: string;
    sheetIdPlaceholder: string;
    promptLabel: string;
    promptHelp: string;
    promptPlaceholder: string;
    promptDefault: string;
    channelsLabel: string;
    channelsHelp: string;
    channelInstagram: string;
    channelFacebook: string;
    statusConnected: string;
    statusDisconnected: string;
    connectAction: string;
    disconnectAction: string;
    saveAction: string;
    saveSaved: string;
  };
  pricing: {
    eyebrow: string;
    title: string;
    subtitle: string;
    setupLabel: string;
    setupPrice: string;
    setupCaption: string;
    monthlyLabel: string;
    monthlyPrice: string;
    monthlyCaption: string;
    includesTitle: string;
    includes: string[];
    primaryCta: string;
    secondaryCta: string;
    footnote: string;
  };
  footer: {
    rights: string;
    terms: string;
    privacy: string;
  };
};

export type FeatureIconKey =
  | "consult"
  | "always-on"
  | "payment-link"
  | "catalog-sync";

export type DemoReply = {
  /** AI text bubble */
  text: string;
  /** Optional inline product card */
  product?: {
    name: string;
    description: string;
    price: string;
    badge?: string;
  };
  /** Optional payment-link CTA bubble */
  paymentLink?: {
    productName: string;
    amount: string;
  };
};

export const dictionaries: Record<Locale, Dictionary> = {
  en: {
    nav: {
      features: "Features",
      demo: "Live demo",
      dashboard: "Dashboard",
      pricing: "Pricing",
      signIn: "Sign in",
      cta: "Get started",
    },
    hero: {
      eyebrow: "AI Sales Manager for Instagram & Facebook",
      titleLine1: "Your AI doesn't just reply.",
      titleLine2Highlight: "It sells.",
      titleLine3: "On every DM. 24/7.",
      subtitle:
        "Ordo turns your product catalog into a senior salesperson that consults customers, recommends the right SKU, and sends a payment link the moment they say yes.",
      primaryCta: "Start free trial",
      secondaryCta: "Try the live demo",
      badges: [
        "Setup in under an hour",
        "Works with your Google Sheet",
        "Cancel anytime",
      ],
    },
    features: {
      eyebrow: "Built to close, not just chat",
      title: "Everything a great sales rep does.",
      titleAccent: "Without the payroll.",
      items: [
        {
          iconKey: "consult",
          title: "Consults like your top rep",
          body: "Reads the full description, specs and use cases from your Google Sheet — then answers customer questions like a human expert who actually knows the product.",
        },
        {
          iconKey: "always-on",
          title: "Replies in seconds, 24/7",
          body: "Picks up every Instagram DM and Facebook Messenger conversation — at 2 AM, on weekends, during your busiest sale. No missed leads, no slow first response.",
        },
        {
          iconKey: "payment-link",
          title: "Sends instant payment links",
          body: "When a customer says \"I'll take it,\" the AI generates and sends a secure payment link inside the same chat. No app switching. No lost momentum.",
        },
        {
          iconKey: "catalog-sync",
          title: "One source of truth",
          body: "Your Google Sheet is the catalog. Update a price or restock an item — the AI knows in seconds. No re-training, no copy-paste between systems.",
        },
      ],
    },
    demo: {
      eyebrow: "Live demo",
      title: "Talk to it like a real customer would.",
      subtitle:
        "Pick a question — see how Ordo handles consultation, objections, and closing. This demo runs on a sample catalog of premium audio gear.",
      aiName: "Ordo Sales AI",
      placeholder: "Ask about a product…",
      sendLabel: "Send",
      suggestionsLabel: "Try a question",
      typing: "Ordo is typing…",
      catalogLabel: "From your catalog",
      payLinkLabel: "Secure payment link",
      payLinkCta: "Pay now",
      productPriceLabel: "Price",
      initialAiMessage:
        "Hi! I'm Ordo, your AI sales manager. I have your full catalog in front of me. What are you looking for today?",
      suggestions: [
        "Recommend wireless headphones for travel",
        "What's the difference vs. AirPods Pro?",
        "I'll take the Studio Pro — how do I pay?",
        "Do you ship to Berlin?",
      ],
      replies: [
        {
          text: "For travel I'd point you at the Studio Pro X. Active noise cancellation rated for cabin pressure, 38-hour battery, and they fold flat into the included hard case — under 240g on the head.",
          product: {
            name: "Studio Pro X — Midnight",
            description:
              "Adaptive ANC · 38h battery · USB-C fast charge · LDAC + AAC · 2-year warranty",
            price: "$329",
            badge: "Best for travel",
          },
        },
        {
          text: "Honest answer: AirPods Pro win on iPhone integration. Studio Pro X wins on battery (38h vs 6h), passive isolation when ANC is off, and they cost $80 less. If you live in Apple-land, AirPods. If you fly a lot, Studio Pro X.",
        },
        {
          text: "Great choice. Here's a secure payment link for the Studio Pro X — Midnight. Card, Apple Pay and Google Pay all work. Once it clears we ship same-day from our EU warehouse.",
          paymentLink: {
            productName: "Studio Pro X — Midnight",
            amount: "$329.00",
          },
        },
        {
          text: "Yes — Berlin is express delivery, 1–2 business days via DHL, free over €100. Tracking lands in your inbox the minute we hand it off.",
        },
      ],
    },
    config: {
      eyebrow: "For paying customers",
      title: "Configure your AI in three fields.",
      subtitle:
        "No prompt engineering degree required. Point Ordo at your spreadsheet, give it a personality, connect a channel.",
      sheetIdLabel: "Google Sheet ID",
      sheetIdHelp:
        "The long string between /d/ and /edit in your sheet URL. Ordo polls it every 60 seconds.",
      sheetIdPlaceholder: "1A2bCdEfGhIjKlMnOpQrStUvWxYz_0123456789",
      promptLabel: "System prompt",
      promptHelp:
        "Tell the AI who it works for, the tone you want, and any rules — discounts, blocked topics, how to handle returns.",
      promptPlaceholder: "You are a sales manager for…",
      promptDefault:
        "You are a senior sales manager for Studio Audio Berlin. Be warm, concise, and never push. Always recommend based on the customer's actual use case. If a customer asks for a discount, offer free expedited shipping instead. Refuse to discuss competitor pricing.",
      channelsLabel: "Connected channels",
      channelsHelp: "Connect the inboxes Ordo should reply on.",
      channelInstagram: "Instagram Business",
      channelFacebook: "Facebook Messenger",
      statusConnected: "Connected",
      statusDisconnected: "Not connected",
      connectAction: "Connect",
      disconnectAction: "Disconnect",
      saveAction: "Save configuration",
      saveSaved: "Saved",
    },
    pricing: {
      eyebrow: "Simple, honest pricing",
      title: "One setup. One subscription.",
      subtitle:
        "We do the integration, prompt tuning and channel hookup. You start selling on autopilot the same week.",
      setupLabel: "Setup fee",
      setupPrice: "$99",
      setupCaption:
        "One-time. Includes catalog import, prompt tuning, Instagram + Facebook connection.",
      monthlyLabel: "Subscription",
      monthlyPrice: "$25",
      monthlyCaption:
        "Per month. Unlimited messages, both channels, ongoing prompt updates.",
      includesTitle: "What you get",
      includes: [
        "AI trained on your full Google Sheet catalog",
        "Instagram DM + Facebook Messenger, both channels included",
        "Instant payment-link generation in chat",
        "Live dashboard for prompt edits and channel status",
        "Email support, 1 business day response",
      ],
      primaryCta: "Pay $99 setup",
      secondaryCta: "Subscribe — $25 / month",
      footnote:
        "All prices in USD. Cancel the subscription anytime — setup fee is non-refundable after onboarding starts.",
    },
    footer: {
      rights: "All rights reserved.",
      terms: "Terms",
      privacy: "Privacy",
    },
  },

  uk: {
    nav: {
      features: "Можливості",
      demo: "Демо",
      dashboard: "Кабінет",
      pricing: "Тарифи",
      signIn: "Увійти",
      cta: "Почати",
    },
    hero: {
      eyebrow: "AI-менеджер продажів для Instagram та Facebook",
      titleLine1: "Ваш AI не просто відповідає.",
      titleLine2Highlight: "Він продає.",
      titleLine3: "У кожному діалозі. 24/7.",
      subtitle:
        "Ordo перетворює ваш каталог товарів на досвідченого менеджера, який консультує клієнтів, радить правильний товар і надсилає посилання на оплату в момент готовності купити.",
      primaryCta: "Безкоштовний тест",
      secondaryCta: "Спробувати демо",
      badges: [
        "Запуск за годину",
        "Працює з вашим Google Sheet",
        "Скасування будь-коли",
      ],
    },
    features: {
      eyebrow: "Створено, щоб закривати угоди",
      title: "Все, що робить найкращий продавець.",
      titleAccent: "Без зарплати.",
      items: [
        {
          iconKey: "consult",
          title: "Консультує як ваш топ-менеджер",
          body: "Читає повний опис, характеристики та сценарії з вашої таблиці — і відповідає на питання як експерт, що дійсно розбирається в товарі.",
        },
        {
          iconKey: "always-on",
          title: "Відповідає за секунди, 24/7",
          body: "Підхоплює кожен DM в Instagram і діалог у Facebook Messenger — о 2 ночі, на вихідних, у пік розпродажу. Жодних втрачених лідів.",
        },
        {
          iconKey: "payment-link",
          title: "Надсилає посилання на оплату",
          body: "Коли клієнт каже «беру», AI миттєво генерує і надсилає захищене посилання на оплату прямо в чат. Без перемикання застосунків.",
        },
        {
          iconKey: "catalog-sync",
          title: "Одне джерело правди",
          body: "Ваш Google Sheet — це каталог. Змінили ціну або поповнили склад — AI знає за секунди. Без перенавчання, без копіпаст.",
        },
      ],
    },
    demo: {
      eyebrow: "Живе демо",
      title: "Поспілкуйтеся як реальний клієнт.",
      subtitle:
        "Оберіть питання — подивіться, як Ordo консультує, відпрацьовує заперечення та закриває угоду. Демо працює на прикладі каталогу преміум аудіо.",
      aiName: "Ordo Sales AI",
      placeholder: "Запитайте про товар…",
      sendLabel: "Надіслати",
      suggestionsLabel: "Спробуйте питання",
      typing: "Ordo набирає…",
      catalogLabel: "З вашого каталогу",
      payLinkLabel: "Захищене посилання на оплату",
      payLinkCta: "Оплатити",
      productPriceLabel: "Ціна",
      initialAiMessage:
        "Привіт! Я Ordo, ваш AI-менеджер продажів. У мене перед очима повний каталог. Що шукаєте сьогодні?",
      suggestions: [
        "Порадьте бездротові навушники для подорожей",
        "Чим вони кращі за AirPods Pro?",
        "Беру Studio Pro — як оплатити?",
        "Чи є доставка в Київ?",
      ],
      replies: [
        {
          text: "Для подорожей раджу Studio Pro X. Активне шумозаглушення розраховане на тиск у літаку, 38 годин автономності, складаються в комплектний жорсткий кейс — менше 240 г на голові.",
          product: {
            name: "Studio Pro X — Midnight",
            description:
              "Адаптивне ANC · 38 год · швидка зарядка USB-C · LDAC + AAC · 2 роки гарантії",
            price: "$329",
            badge: "Топ для подорожей",
          },
        },
        {
          text: "Чесно: AirPods Pro кращі для iPhone-екосистеми. Studio Pro X виграють у автономності (38 год проти 6), пасивній ізоляції без ANC і коштують на $80 дешевше. Живете в Apple — AirPods. Багато літаєте — Studio Pro X.",
        },
        {
          text: "Чудовий вибір. Ось захищене посилання на оплату Studio Pro X — Midnight. Картка, Apple Pay і Google Pay. Після оплати — відправка того ж дня з нашого європейського складу.",
          paymentLink: {
            productName: "Studio Pro X — Midnight",
            amount: "$329.00",
          },
        },
        {
          text: "Так — Київ це експрес-доставка 2–3 робочі дні через Нову Пошту, безкоштовно при замовленні від $100. Трекінг прийде на пошту одразу після відправлення.",
        },
      ],
    },
    config: {
      eyebrow: "Для платних клієнтів",
      title: "Налаштуйте AI у трьох полях.",
      subtitle:
        "Без знань prompt-інжинірингу. Вкажіть свою таблицю, задайте характер, підключіть канал.",
      sheetIdLabel: "ID Google Sheet",
      sheetIdHelp:
        "Довгий рядок між /d/ та /edit у URL вашої таблиці. Ordo синхронізується кожні 60 секунд.",
      sheetIdPlaceholder: "1A2bCdEfGhIjKlMnOpQrStUvWxYz_0123456789",
      promptLabel: "Системний промпт",
      promptHelp:
        "Опишіть, на кого працює AI, який тон, які правила — знижки, заборонені теми, як працювати з поверненнями.",
      promptPlaceholder: "Ти менеджер з продажу…",
      promptDefault:
        "Ти досвідчений менеджер з продажу Studio Audio Kyiv. Спілкуйся тепло, лаконічно, без тиску. Завжди рекомендуй під реальний сценарій клієнта. Якщо просять знижку — пропонуй безкоштовну експрес-доставку. Не обговорюй ціни конкурентів.",
      channelsLabel: "Підключені канали",
      channelsHelp: "Підключіть інбокси, в яких Ordo має відповідати.",
      channelInstagram: "Instagram Business",
      channelFacebook: "Facebook Messenger",
      statusConnected: "Підключено",
      statusDisconnected: "Не підключено",
      connectAction: "Підключити",
      disconnectAction: "Відключити",
      saveAction: "Зберегти налаштування",
      saveSaved: "Збережено",
    },
    pricing: {
      eyebrow: "Прозорі тарифи",
      title: "Одна настройка. Одна підписка.",
      subtitle:
        "Ми робимо інтеграцію, налаштування промпту та підключення каналів. Ви починаєте продавати на автопілоті того ж тижня.",
      setupLabel: "Налаштування",
      setupPrice: "$99",
      setupCaption:
        "Одноразово. Включає імпорт каталогу, налаштування промпту, підключення Instagram і Facebook.",
      monthlyLabel: "Підписка",
      monthlyPrice: "$25",
      monthlyCaption:
        "На місяць. Безліміт повідомлень, обидва канали, оновлення промпту.",
      includesTitle: "Що ви отримуєте",
      includes: [
        "AI, навчений на вашому Google Sheet каталозі",
        "Instagram DM + Facebook Messenger — обидва канали в комплекті",
        "Миттєва генерація посилань на оплату в чаті",
        "Кабінет для редагування промпту і статусу каналів",
        "Підтримка email, відповідь протягом 1 робочого дня",
      ],
      primaryCta: "Сплатити $99 за налаштування",
      secondaryCta: "Підписка — $25 / міс.",
      footnote:
        "Всі ціни в USD. Підписку можна скасувати будь-коли — оплата за налаштування не повертається після старту онбордингу.",
    },
    footer: {
      rights: "Всі права захищені.",
      terms: "Умови",
      privacy: "Приватність",
    },
  },

  ru: {
    nav: {
      features: "Возможности",
      demo: "Демо",
      dashboard: "Кабинет",
      pricing: "Тарифы",
      signIn: "Войти",
      cta: "Начать",
    },
    hero: {
      eyebrow: "AI-менеджер продаж для Instagram и Facebook",
      titleLine1: "Ваш AI не просто отвечает.",
      titleLine2Highlight: "Он продаёт.",
      titleLine3: "В каждом диалоге. 24/7.",
      subtitle:
        "Ordo превращает ваш каталог в опытного менеджера, который консультирует клиентов, советует правильный товар и отправляет ссылку на оплату в момент готовности купить.",
      primaryCta: "Бесплатный тест",
      secondaryCta: "Попробовать демо",
      badges: [
        "Запуск за час",
        "Работает с вашим Google Sheet",
        "Отмена в любой момент",
      ],
    },
    features: {
      eyebrow: "Сделан, чтобы закрывать сделки",
      title: "Всё, что делает лучший продавец.",
      titleAccent: "Без зарплаты.",
      items: [
        {
          iconKey: "consult",
          title: "Консультирует как топ-менеджер",
          body: "Читает полное описание, характеристики и сценарии из вашей таблицы — и отвечает на вопросы как эксперт, который реально разбирается в товаре.",
        },
        {
          iconKey: "always-on",
          title: "Отвечает за секунды, 24/7",
          body: "Подхватывает каждое сообщение в Instagram и диалог в Facebook Messenger — в 2 часа ночи, в выходные, на пике распродажи. Никаких упущенных лидов.",
        },
        {
          iconKey: "payment-link",
          title: "Отправляет ссылку на оплату",
          body: "Когда клиент говорит «беру», AI мгновенно генерирует и отправляет защищённую ссылку прямо в чат. Без переключения приложений.",
        },
        {
          iconKey: "catalog-sync",
          title: "Один источник истины",
          body: "Ваш Google Sheet — это каталог. Изменили цену или пополнили склад — AI знает через секунды. Без переобучения, без копипаста.",
        },
      ],
    },
    demo: {
      eyebrow: "Живое демо",
      title: "Поговорите как реальный клиент.",
      subtitle:
        "Выберите вопрос — посмотрите, как Ordo консультирует, отрабатывает возражения и закрывает сделку. Демо работает на примере каталога премиум аудио.",
      aiName: "Ordo Sales AI",
      placeholder: "Спросите про товар…",
      sendLabel: "Отправить",
      suggestionsLabel: "Попробуйте вопрос",
      typing: "Ordo печатает…",
      catalogLabel: "Из вашего каталога",
      payLinkLabel: "Защищённая ссылка на оплату",
      payLinkCta: "Оплатить",
      productPriceLabel: "Цена",
      initialAiMessage:
        "Привет! Я Ordo, ваш AI-менеджер продаж. У меня перед глазами полный каталог. Что ищете сегодня?",
      suggestions: [
        "Посоветуйте беспроводные наушники для путешествий",
        "Чем они лучше AirPods Pro?",
        "Беру Studio Pro — как оплатить?",
        "Доставляете в Москву?",
      ],
      replies: [
        {
          text: "Для путешествий советую Studio Pro X. Активное шумоподавление рассчитано на давление в самолёте, 38 часов автономности, складываются в комплектный жёсткий кейс — меньше 240 г на голове.",
          product: {
            name: "Studio Pro X — Midnight",
            description:
              "Адаптивное ANC · 38 ч · быстрая зарядка USB-C · LDAC + AAC · 2 года гарантии",
            price: "$329",
            badge: "Топ для путешествий",
          },
        },
        {
          text: "Честно: AirPods Pro лучше для iPhone-экосистемы. Studio Pro X выигрывают в автономности (38 ч против 6), пассивной изоляции без ANC и стоят на $80 дешевле. Живёте в Apple — AirPods. Много летаете — Studio Pro X.",
        },
        {
          text: "Отличный выбор. Вот защищённая ссылка на оплату Studio Pro X — Midnight. Карта, Apple Pay и Google Pay. После оплаты отправка в тот же день с нашего европейского склада.",
          paymentLink: {
            productName: "Studio Pro X — Midnight",
            amount: "$329.00",
          },
        },
        {
          text: "Да — Москва это экспресс-доставка 3–5 рабочих дней, бесплатно при заказе от $100. Трекинг придёт на почту сразу после отправки.",
        },
      ],
    },
    config: {
      eyebrow: "Для платящих клиентов",
      title: "Настройте AI в трёх полях.",
      subtitle:
        "Без знаний prompt-инжиниринга. Укажите свою таблицу, задайте характер, подключите канал.",
      sheetIdLabel: "ID Google Sheet",
      sheetIdHelp:
        "Длинная строка между /d/ и /edit в URL вашей таблицы. Ordo синхронизируется каждые 60 секунд.",
      sheetIdPlaceholder: "1A2bCdEfGhIjKlMnOpQrStUvWxYz_0123456789",
      promptLabel: "Системный промпт",
      promptHelp:
        "Опишите, на кого работает AI, какой тон, какие правила — скидки, запретные темы, как работать с возвратами.",
      promptPlaceholder: "Ты менеджер по продажам…",
      promptDefault:
        "Ты опытный менеджер по продажам Studio Audio Moscow. Общайся тепло, лаконично, без давления. Всегда рекомендуй под реальный сценарий клиента. Если просят скидку — предложи бесплатную экспресс-доставку. Не обсуждай цены конкурентов.",
      channelsLabel: "Подключённые каналы",
      channelsHelp: "Подключите инбоксы, в которых Ordo должен отвечать.",
      channelInstagram: "Instagram Business",
      channelFacebook: "Facebook Messenger",
      statusConnected: "Подключено",
      statusDisconnected: "Не подключено",
      connectAction: "Подключить",
      disconnectAction: "Отключить",
      saveAction: "Сохранить настройки",
      saveSaved: "Сохранено",
    },
    pricing: {
      eyebrow: "Прозрачные тарифы",
      title: "Одна настройка. Одна подписка.",
      subtitle:
        "Мы делаем интеграцию, настройку промпта и подключение каналов. Вы начинаете продавать на автопилоте на той же неделе.",
      setupLabel: "Настройка",
      setupPrice: "$99",
      setupCaption:
        "Единоразово. Включает импорт каталога, настройку промпта, подключение Instagram и Facebook.",
      monthlyLabel: "Подписка",
      monthlyPrice: "$25",
      monthlyCaption:
        "В месяц. Безлимит сообщений, оба канала, обновления промпта.",
      includesTitle: "Что вы получаете",
      includes: [
        "AI, обученный на вашем Google Sheet каталоге",
        "Instagram DM + Facebook Messenger — оба канала в комплекте",
        "Мгновенная генерация ссылок на оплату в чате",
        "Кабинет для редактирования промпта и статуса каналов",
        "Поддержка email, ответ в течение 1 рабочего дня",
      ],
      primaryCta: "Оплатить $99 за настройку",
      secondaryCta: "Подписка — $25 / мес.",
      footnote:
        "Все цены в USD. Подписку можно отменить в любой момент — оплата за настройку не возвращается после старта онбординга.",
    },
    footer: {
      rights: "Все права защищены.",
      terms: "Условия",
      privacy: "Приватность",
    },
  },
};
