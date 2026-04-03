type PublicSupabaseEnv = {
  url: string;
  anonKey: string;
};

type ServiceSupabaseEnv = {
  url: string;
  serviceRoleKey: string;
};

const RAW_ENV = {
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_PROJECT_URL: process.env.NEXT_PUBLIC_SUPABASE_PROJECT_URL,
  SUPABASE_URL: process.env.SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY,
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
} as const;

function readEnv(name: keyof typeof RAW_ENV): string | null {
  const value = RAW_ENV[name];
  return value && value.trim() ? value.trim() : null;
}

function getFirstEnv(names: readonly (keyof typeof RAW_ENV)[]): string | null {
  for (const name of names) {
    const value = readEnv(name);
    if (value) return value;
  }
  return null;
}

function getRequiredEnv(names: readonly (keyof typeof RAW_ENV)[]): string {
  const value = getFirstEnv(names);
  if (!value) {
    throw new Error(
      `[supabase] Missing required env. Tried: ${names.join(", ")}`,
    );
  }
  return value;
}

function assertValidUrl(url: string) {
  try {
    new URL(url);
  } catch {
    throw new Error("[supabase] NEXT_PUBLIC_SUPABASE_URL must be a valid URL");
  }
}

export function getSupabasePublicEnv(): PublicSupabaseEnv {
  const url = getRequiredEnv([
    "NEXT_PUBLIC_SUPABASE_URL",
    "NEXT_PUBLIC_SUPABASE_PROJECT_URL",
    "SUPABASE_URL",
  ]);
  const anonKey = getRequiredEnv([
    "NEXT_PUBLIC_SUPABASE_ANON_KEY",
    "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
    "SUPABASE_ANON_KEY",
  ]);
  assertValidUrl(url);
  return { url, anonKey };
}

export function getSupabaseServiceEnv(): ServiceSupabaseEnv {
  const url = getRequiredEnv([
    "NEXT_PUBLIC_SUPABASE_URL",
    "NEXT_PUBLIC_SUPABASE_PROJECT_URL",
    "SUPABASE_URL",
  ]);
  const serviceRoleKey = getRequiredEnv(["SUPABASE_SERVICE_ROLE_KEY"]);
  assertValidUrl(url);
  return { url, serviceRoleKey };
}
