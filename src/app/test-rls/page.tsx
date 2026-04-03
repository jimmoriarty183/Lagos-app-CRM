import { supabaseServerReadOnly } from "@/lib/supabase/server";

const SUPABASE_DEBUG = process.env.SUPABASE_DEBUG === "1";

async function createSupabaseServerClient() {
  return supabaseServerReadOnly();
}

export default async function TestRLSPage() {
  const supabase = await createSupabaseServerClient(); // <-- await

  const { data: authData } = await supabase.auth.getUser();
  const { data: sessionData } = await supabase.auth.getSession();

  const { data: businesses, error: bizError } = await supabase
    .from("businesses")
    .select("id, slug")
    .limit(5);

  const { data: orders, error: ordersError } = await supabase
    .from("orders")
    .select("id, business_id")
    .limit(200);

  if (SUPABASE_DEBUG) {
    console.log("[supabase-debug][test-rls] query diagnostics", {
      hasSession: Boolean(sessionData.session),
      userId: authData?.user?.id ?? null,
      businessesError: bizError?.message ?? null,
      ordersError: ordersError?.message ?? null,
      businessesCount: businesses?.length ?? 0,
      ordersCount: orders?.length ?? 0,
    });
  }

  return (
    <main
      style={{
        padding: 24,
        fontFamily:
          "var(--font-geist-sans), -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
      }}
    >
      <h1 style={{ fontSize: 18, marginBottom: 12 }}>/test-rls</h1>

      <pre style={{ whiteSpace: "pre-wrap" }}>
        {JSON.stringify(
          {
            user: authData?.user
              ? { id: authData.user.id, email: authData.user.email }
              : null,
            session: {
              exists: Boolean(sessionData.session),
            },
            businesses: {
              count: businesses?.length ?? 0,
              error: bizError?.message ?? null,
              sample: businesses ?? [],
            },
            orders: {
              count: orders?.length ?? 0,
              error: ordersError?.message ?? null,
              sample: (orders ?? []).slice(0, 5),
            },
          },
          null,
          2
        )}
      </pre>
    </main>
  );
}
