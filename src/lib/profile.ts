import type { SupabaseClient } from "@supabase/supabase-js";

export type UserProfileSnapshot = {
  id: string;
  email: string | null;
  full_name: string | null;
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
  birth_date: string | null;
  bio: string | null;
  avatar_url: string | null;
};

function asText(value: unknown) {
  const text = String(value ?? "").trim();
  return text || null;
}

export async function loadUserProfileSafe(
  client: SupabaseClient,
  userId: string,
): Promise<UserProfileSnapshot | null> {
  const attempts = [
    "id,email,full_name,first_name,last_name,phone,birth_date,bio,avatar_url",
    "id,email,full_name,first_name,last_name,phone",
    "id,email,full_name,first_name,last_name",
  ];

  for (const selectColumns of attempts) {
    const { data, error } = await client
      .from("profiles")
      .select(selectColumns)
      .eq("id", userId)
      .maybeSingle();
    if (error) continue;

    if (!data) return null;
    const row = data as Record<string, unknown>;
    return {
      id: String(row.id ?? userId),
      email: asText(row.email),
      full_name: asText(row.full_name),
      first_name: asText(row.first_name),
      last_name: asText(row.last_name),
      phone: asText(row.phone),
      birth_date: asText(row.birth_date),
      bio: asText(row.bio),
      avatar_url: asText(row.avatar_url),
    };
  }

  return null;
}

