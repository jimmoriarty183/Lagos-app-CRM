import { isAdminEmail } from "@/lib/admin-access";
import { supabaseServerReadOnly } from "@/lib/supabase/server";

export async function requireApiAdmin() {
  const supabase = await supabaseServerReadOnly();
  const { data, error } = await supabase.auth.getUser();
  const user = data.user;

  if (error || !user?.email || !isAdminEmail(user.email)) {
    throw new Error("Forbidden");
  }

  return user;
}

