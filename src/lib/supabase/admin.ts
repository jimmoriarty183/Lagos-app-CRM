import { supabaseServiceRole } from "@/lib/supabase/server";

export function supabaseAdmin() {
  return supabaseServiceRole();
}
