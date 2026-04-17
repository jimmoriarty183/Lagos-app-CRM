import { notFound } from "next/navigation";
import { AdminShell } from "@/app/admin/_components/AdminShell";
import { requireAdminUser } from "@/lib/admin/access";
import { supabaseAdmin } from "@/lib/supabase/admin";
import BillingAccountAdminClient from "./BillingAccountAdminClient";

type PageProps = {
  params: Promise<{ accountId: string }>;
};

type FeatureOptionRaw = {
  id: string;
  key: string;
  name: string;
  value_type: "boolean" | "integer" | "text";
};

export default async function AdminBillingAccountPage({ params }: PageProps) {
  const { workspaceHref } = await requireAdminUser();
  const { accountId } = await params;
  const admin = supabaseAdmin();

  const [{ data: accountData, error: accountError }, { data: featuresData, error: featuresError }] =
    await Promise.all([
      admin
        .from("accounts")
        .select("id, name")
        .eq("id", accountId)
        .maybeSingle(),
      admin
        .from("features")
        .select("id, key, name, value_type")
        .order("key", { ascending: true }),
    ]);

  if (accountError) throw accountError;
  if (!accountData) notFound();
  if (featuresError) throw featuresError;

  const features = ((featuresData ?? []) as FeatureOptionRaw[]).map((feature) => ({
    id: feature.id,
    code: feature.key,
    name: feature.name || feature.key,
    value_type: feature.value_type,
  }));

  return (
    <AdminShell
      activeHref="/admin/billing"
      workspaceHref={workspaceHref}
      title={`Billing: ${String((accountData as { name?: string }).name ?? accountId)}`}
      description="Subscription, entitlements, and manual overrides for selected account."
    >
      <BillingAccountAdminClient
        accountId={accountId}
        accountName={String((accountData as { name?: string }).name ?? accountId)}
        features={features}
      />
    </AdminShell>
  );
}


