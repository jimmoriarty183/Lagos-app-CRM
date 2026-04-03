import { cookies } from "next/headers";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";
import { getSupabasePublicEnv, getSupabaseServiceEnv } from "@/lib/supabase/env";

/**
 * Server client for Server Components: reads auth cookies only.
 * Use for data reads in pages/layouts where cookie mutation is not allowed.
 */
export async function supabaseServerComponent() {
  const cookieStore = await cookies();
  const { url, anonKey } = getSupabasePublicEnv();

  return createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll() {
        // Cookie writes are not allowed in Server Components.
      },
    },
  });
}

/**
 * Server client for Route Handlers / Server Actions: reads and writes auth cookies.
 */
export async function supabaseServerAction() {
  const cookieStore = await cookies();
  const { url, anonKey } = getSupabasePublicEnv();

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

/**
 * Server-only admin client (service_role). Never use in client components.
 */
export function supabaseServiceRole(): SupabaseClient {
  const { url, serviceRoleKey } = getSupabaseServiceEnv();
  return createClient(url, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

// Backward-compatible aliases used across the codebase.
export async function supabaseServerReadOnly() {
  return supabaseServerComponent();
}

export async function supabaseServer() {
  return supabaseServerAction();
}
