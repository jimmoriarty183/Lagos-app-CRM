import { supabaseServiceRole } from "@/lib/supabase/server";

/**
 * Per-merchant Instagram connection — token, catalog pointer, custom
 * prompt, etc. Webhook handlers and the bot pipeline accept this object
 * instead of reading env vars, so multiple businesses can each have
 * their own connected IG account.
 */
export type InstagramConnection = {
  id: string;
  business_id: string;
  ig_user_id: string;
  ig_username: string;
  ig_account_type: string | null;
  ig_access_token: string;
  expires_at: string | null;
  webhook_subscribed: boolean;
  catalog_sheet_id: string | null;
  catalog_sheet_gid: string;
  system_prompt: string | null;
  shop_name: string | null;
  shop_about: string | null;
  shop_address: string | null;
  shop_contact: string | null;
  enabled: boolean;
};

const SELECT_COLUMNS =
  "id, business_id, ig_user_id, ig_username, ig_account_type, ig_access_token, expires_at, webhook_subscribed, catalog_sheet_id, catalog_sheet_gid, system_prompt, shop_name, shop_about, shop_address, shop_contact, enabled";

/**
 * Look up the connection for a given Instagram Business account id
 * (the value Meta puts in `entry[].id` of webhook payloads, or that
 * /me returns for our own token). Service-role query — used by webhook
 * handlers that have no user session.
 */
export async function getInstagramConnectionByIgUserId(
  igUserId: string,
): Promise<InstagramConnection | null> {
  if (!igUserId) return null;
  const admin = supabaseServiceRole();
  const { data, error } = await admin
    .from("instagram_connections")
    .select(SELECT_COLUMNS)
    .eq("ig_user_id", igUserId)
    .eq("enabled", true)
    .maybeSingle();
  if (error) {
    console.error("[ig-connections] lookup by ig_user_id failed", {
      igUserId,
      error: error.message,
    });
    return null;
  }
  return (data as InstagramConnection | null) ?? null;
}

/**
 * Fetch a single connection by row id. Used by config endpoints that
 * already know which connection they're editing.
 */
export async function getInstagramConnectionById(
  id: string,
): Promise<InstagramConnection | null> {
  if (!id) return null;
  const admin = supabaseServiceRole();
  const { data, error } = await admin
    .from("instagram_connections")
    .select(SELECT_COLUMNS)
    .eq("id", id)
    .maybeSingle();
  if (error) {
    console.error("[ig-connections] lookup by id failed", {
      id,
      error: error.message,
    });
    return null;
  }
  return (data as InstagramConnection | null) ?? null;
}

/**
 * Convenience for the diag endpoint: the most recently connected
 * enabled connection (any business), if any. Lets `?action=me` work
 * out of the box without having to specify which connection.
 */
export async function getFirstEnabledInstagramConnection(): Promise<InstagramConnection | null> {
  const admin = supabaseServiceRole();
  const { data, error } = await admin
    .from("instagram_connections")
    .select(SELECT_COLUMNS)
    .eq("enabled", true)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) {
    console.error("[ig-connections] first enabled lookup failed", {
      error: error.message,
    });
    return null;
  }
  return (data as InstagramConnection | null) ?? null;
}
