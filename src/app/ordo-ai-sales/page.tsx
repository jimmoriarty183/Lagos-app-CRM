import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { SUPPORTED_LOCALES, type Locale } from "./i18n";

/**
 * Bare /ordo-ai-sales has no locale prefix — pick the best one from
 * Accept-Language and 308-redirect. URL is the source of truth for locale,
 * so we never render at this path.
 */
async function pickLocale(): Promise<Locale> {
  const h = await headers();
  const accept = (h.get("accept-language") ?? "").toLowerCase();
  const candidates = accept
    .split(",")
    .map((part) => part.split(";")[0]?.trim().slice(0, 2))
    .filter(Boolean);
  for (const tag of candidates) {
    if (SUPPORTED_LOCALES.includes(tag as Locale)) return tag as Locale;
  }
  return "en";
}

export default async function Page() {
  const locale = await pickLocale();
  redirect(`/ordo-ai-sales/${locale}`);
}
