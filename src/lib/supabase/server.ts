import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

function getEnv() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  if (!url || !anonKey) throw new Error("Missing Supabase env vars");
  return { url, anonKey };
}

/**
 * ✅ Для Server Components (page.tsx / layout.tsx)
 * Только чтение cookies (без setAll).
 */
export async function supabaseServerComponent() {
  const cookieStore = await cookies();
  const { url, anonKey } = getEnv();

  return createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll() {
        // ❌ нельзя менять cookies в RSC
      },
    },
  });
}

/**
 * ✅ Для Route Handlers / Server Actions
 * Здесь можно set cookies.
 */
export async function supabaseServerAction() {
  const cookieStore = await cookies();
  const { url, anonKey } = getEnv();

  return createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        for (const { name, value, options } of cookiesToSet) {
          cookieStore.set(name, value, options);
        }
      },
    },
  });
}

/* ------------------------------------------------------------------ */
/* ✅ ALIASES для твоего текущего кода (чтобы не чинить 20 импортов)     */
/* ------------------------------------------------------------------ */

// Старое имя для Server Components (read-only)
export async function supabaseServerReadOnly() {
  return supabaseServerComponent();
}

// Старое имя для Route Handlers / Actions (write cookies)
export async function supabaseServer() {
  return supabaseServerAction();
}