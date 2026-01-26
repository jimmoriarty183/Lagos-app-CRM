// src/lib/supabase/server.ts
import "server-only";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

function getEnv() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  return { url, key };
}

/**
 * ✅ Для Server Components: НИКОГДА не пишет cookies (иначе Next 16 падает).
 */
export async function supabaseServerComponent() {
  const cookieStore = await cookies();
  const { url, key } = getEnv();

  return createServerClient(url, key, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      // ❗️важно: в Server Component нельзя менять cookies
      setAll() {
        // no-op
      },
    },
  });
}

/**
 * ✅ Для Route Handlers / Server Actions: можно писать cookies
 */
export async function supabaseServerAction() {
  const cookieStore = await cookies();
  const { url, key } = getEnv();

  return createServerClient(url, key, {
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
