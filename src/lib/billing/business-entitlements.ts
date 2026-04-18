import type { SupabaseClient } from "@supabase/supabase-js";
import { hasFeature } from "@/lib/billing/entitlements";
import { resolveOwnerAccountId } from "@/lib/businesses/business-limits-service";

// Resolves the account behind a business slug and returns the export/import
// boolean entitlements. Safe to call from server components — falls back
// to false on any lookup error so the UI degrades gracefully.
export async function resolveBusinessDataEntitlements(
  admin: SupabaseClient,
  options: { businessSlug?: string | null; businessId?: string | null; ownerUserId?: string | null },
): Promise<{ canExport: boolean; canImport: boolean; accountId: string | null }> {
  try {
    let accountId: string | null = null;
    const slug = String(options.businessSlug ?? "").trim();
    const businessId = String(options.businessId ?? "").trim();

    if (slug || businessId) {
      const query = admin.from("businesses").select("account_id");
      const res = slug
        ? await query.eq("slug", slug).maybeSingle()
        : await query.eq("id", businessId).maybeSingle();
      if (!res.error && res.data) {
        accountId = String((res.data as { account_id?: string | null }).account_id ?? "").trim() || null;
      }
    }

    if (!accountId && options.ownerUserId) {
      accountId = await resolveOwnerAccountId(admin, options.ownerUserId);
    }

    if (!accountId) {
      return { canExport: false, canImport: false, accountId: null };
    }

    const [canExport, canImport] = await Promise.all([
      hasFeature(admin, accountId, "export_csv"),
      hasFeature(admin, accountId, "import_csv"),
    ]);
    return { canExport, canImport, accountId };
  } catch {
    return { canExport: false, canImport: false, accountId: null };
  }
}
