import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";

export default async function TeamSettingsRedirect() {
  const supabase = await supabaseServer();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  // Пытаемся понять phone (как в других местах)
  const phone =
    (user as any)?.phone ||
    (user as any)?.user_metadata?.phone ||
    (user as any)?.user_metadata?.phone_number ||
    null;

  // 1) Самый надежный способ: если пользователь owner по phone
  if (phone) {
    const { data: owned } = await supabase
      .from("businesses")
      .select("slug")
      .eq("owner_phone", phone)
      .limit(1)
      .maybeSingle();

    if (owned?.slug) redirect(`/b/${owned.slug}/settings/team`);
  }

  // 2) Фолбэк: если есть membership таблица (популярное имя)
  // Если у тебя таблица называется иначе — поменяй "business_members" на своё имя
  const { data: member } = await supabase
    .from("business_members")
    .select("business:businesses(slug)")
    .eq("user_id", user.id)
    .limit(1)
    .maybeSingle();

  const slug = (member as any)?.business?.slug;
  if (slug) redirect(`/b/${slug}/settings/team`);

  // 3) если вообще ничего не нашли
  redirect("/login?no_business=1");
}
