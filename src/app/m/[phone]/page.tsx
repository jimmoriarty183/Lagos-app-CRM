import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { normalizePhone } from "@/lib/phone";

type PageProps = {
  params: Promise<{ phone: string }>;
};

type Business = {
  id: string;
  slug: string;
  owner_phone: string;
  manager_phone: string | null;
  plan: string;
  expires_at: string;
};

export default async function ManagerHome({ params }: PageProps) {
  const { phone: phoneParam } = await params;

  const rawPhone = decodeURIComponent(phoneParam || "");
  const phone = normalizePhone(rawPhone);

  const { data: businesses, error } = await supabase
    .from("businesses")
    .select("id, slug, owner_phone, manager_phone, plan, expires_at, created_at")
    .or(`owner_phone.eq.${phone},manager_phone.eq.${phone}`)
    .order("created_at", { ascending: false });

  const list = (businesses || []) as Business[];

  return (
    <main className="min-h-screen bg-zinc-50">
      <div className="mx-auto max-w-4xl p-6">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold">Your businesses</h1>
          <p className="text-sm text-zinc-600 mt-1">
            Phone: <span className="font-mono">{phone || "—"}</span>
          </p>
          {error ? (
            <p className="mt-2 text-sm text-red-600">
              Supabase error: {error.message}
            </p>
          ) : null}
        </div>

        {list.length === 0 ? (
          <div className="rounded-2xl border bg-white p-6 shadow-sm">
            <div className="text-lg font-semibold">No businesses found</div>
            <div className="mt-1 text-sm text-zinc-600">
              This phone is not set as owner_phone or manager_phone for any
              business.
            </div>

            <div className="mt-4 text-sm text-zinc-600">
              <div className="font-semibold mb-1">Check:</div>
              <ul className="list-disc pl-5 space-y-1">
                <li>
                  In DB store phones as digits only (recommended):{" "}
                  <span className="font-mono">380991112233</span>
                </li>
                <li>
                  Your URL can be like:{" "}
                  <span className="font-mono">/m/380991112233</span>
                </li>
                <li>
                  Business page expects query param <span className="font-mono">u</span>:
                  <span className="font-mono"> /b/test?u=380991112233</span>
                </li>
              </ul>
            </div>
          </div>
        ) : (
          <div className="grid gap-4">
            {list.map((b) => (
              <div
                key={b.id}
                className="rounded-2xl border bg-white p-6 shadow-sm flex items-center justify-between"
              >
                <div>
                  <div className="text-lg font-semibold">{b.slug}</div>
                  <div className="mt-1 text-sm text-zinc-600">
                    Plan: {b.plan} • Expires:{" "}
                    {b.expires_at ? new Date(b.expires_at).toLocaleDateString() : "—"}
                  </div>
                  <div className="mt-2 text-xs text-zinc-500">
                    owner: <span className="font-mono">{b.owner_phone}</span>
                    {b.manager_phone ? (
                      <>
                        {" "}
                        • manager:{" "}
                        <span className="font-mono">{b.manager_phone}</span>
                      </>
                    ) : null}
                  </div>
                </div>

                {/* ВАЖНО: используем ?u=... чтобы совпало с /b/[slug] */}
                <Link
                  href={`/b/${b.slug}?u=${encodeURIComponent(phone)}`}
                  className="inline-flex items-center rounded-xl bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800"
                >
                  OPEN
                </Link>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
