import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

async function createSupabaseServerClient() {
  const cookieStore = await cookies(); // <-- ВАЖНО: await

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  return createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        } catch {}
      },
    },
  });
}

export default async function TestRLSPage() {
  const supabase = await createSupabaseServerClient(); // <-- await

  const { data: authData } = await supabase.auth.getUser();

  const { data: businesses, error: bizError } = await supabase
    .from("businesses")
    .select("id, slug")
    .limit(5);

  const { data: orders, error: ordersError } = await supabase
    .from("orders")
    .select("id, business_id")
    .limit(200);

  return (
    <main
      style={{
        padding: 24,
        fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
      }}
    >
      <h1 style={{ fontSize: 18, marginBottom: 12 }}>/test-rls</h1>

      <pre style={{ whiteSpace: "pre-wrap" }}>
        {JSON.stringify(
          {
            user: authData?.user
              ? { id: authData.user.id, email: authData.user.email }
              : null,
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
