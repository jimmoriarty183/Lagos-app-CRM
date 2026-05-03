import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { OrdoAiSalesPage } from "../OrdoAiSalesPage";
import { SUPPORTED_LOCALES, type Locale } from "../i18n";

const META: Record<
  Locale,
  { title: string; description: string; ogLocale: string }
> = {
  en: {
    title: "Ordo AI Sales Manager — Sells, doesn't just reply",
    description:
      "AI-powered sales manager for Instagram and Facebook Messenger. Consults customers using your real product catalog, sends instant payment links, works 24/7. From $99 setup + $25/month.",
    ogLocale: "en_US",
  },
  uk: {
    title: "Ordo AI — менеджер продажів, який закриває угоди",
    description:
      "AI-менеджер продажів для Instagram і Facebook Messenger. Консультує клієнтів на основі вашого каталогу, надсилає посилання на оплату, працює 24/7. Від $99 за налаштування + $25/міс.",
    ogLocale: "uk_UA",
  },
  ru: {
    title: "Ordo AI — менеджер продаж, который закрывает сделки",
    description:
      "AI-менеджер продаж для Instagram и Facebook Messenger. Консультирует клиентов на основе вашего каталога, отправляет ссылки на оплату, работает 24/7. От $99 за настройку + $25/мес.",
    ogLocale: "ru_RU",
  },
};

export function generateStaticParams() {
  return SUPPORTED_LOCALES.map((locale) => ({ locale }));
}

type RouteParams = { locale: string };

export async function generateMetadata({
  params,
}: {
  params: Promise<RouteParams>;
}): Promise<Metadata> {
  const { locale } = await params;
  if (!SUPPORTED_LOCALES.includes(locale as Locale)) return {};
  const m = META[locale as Locale];
  const path = `/ordo-ai-sales/${locale}`;
  return {
    title: m.title,
    description: m.description,
    alternates: {
      canonical: path,
      languages: {
        en: "/ordo-ai-sales/en",
        uk: "/ordo-ai-sales/uk",
        ru: "/ordo-ai-sales/ru",
        "x-default": "/ordo-ai-sales/en",
      },
    },
    openGraph: {
      type: "website",
      url: path,
      title: m.title,
      description: m.description,
      siteName: "Ordo",
      locale: m.ogLocale,
      images: [
        {
          url: "/brand/app_icon.svg",
          width: 512,
          height: 512,
          alt: "Ordo AI Sales Manager",
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: m.title,
      description: m.description,
      images: ["/brand/app_icon.svg"],
    },
  };
}

export default async function Page({
  params,
}: {
  params: Promise<RouteParams>;
}) {
  const { locale } = await params;
  if (!SUPPORTED_LOCALES.includes(locale as Locale)) {
    notFound();
  }
  return <OrdoAiSalesPage locale={locale as Locale} />;
}
