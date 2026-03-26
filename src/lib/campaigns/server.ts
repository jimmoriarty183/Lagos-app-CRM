import { supabaseAdmin } from "@/lib/supabase/admin";
import { supabaseServerAction } from "@/lib/supabase/server";

export async function getUserCampaignClient() {
  return supabaseServerAction();
}

export async function getUserCampaignReadClient() {
  // Route handlers may need to refresh auth cookies while reading campaign data.
  return supabaseServerAction();
}

export function getAdminCampaignClient() {
  return supabaseAdmin();
}

export async function getRequiredUserId() {
  const client = await supabaseServerAction();
  const { data, error } = await client.auth.getUser();
  if (error || !data.user?.id) {
    throw new Error("Not authenticated");
  }
  return data.user.id;
}
