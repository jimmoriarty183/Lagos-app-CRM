"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type BusinessInfo = {
  id: string;
  slug: string;
  name?: string | null;
};

function parseHashTokens(hash: string) {
  const h = (hash || "").replace(/^#/, "");
  const p = new URLSearchParams(h);
  const access_token = p.get("access_token") || "";
  const refresh_token = p.get("refresh_token") || "";
  return { access_token, refresh_token };
}

export default function InvitePage() {
  const router = useRouter();
  const sp = useSearchParams();
  const inviteId = sp.get("invite_id") || "";

  const supabase = useMemo(() => createClient(), []);

  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState<string>("");
  const [business, setBusiness] = useState<BusinessInfo | null>(null);

  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");

  const [password, setPassword] = useState("");
  const [password2, setPassword2] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string>("");

  async function ensureSessionFromHash() {
    // ✅ если в URL есть #access_token — ставим сессию
    if (typeof window === "undefined") return;

    const { access_token, refresh_token } = parseHashTokens(
      window.location.hash,
    );
    if (access_token && refresh_token) {
      const { error: setErr } = await supabase.auth.setSession({
        access_token,
        refresh_token,
      });

      // ✅ чистим URL (убираем hash), чтобы не светить токены
      window.history.replaceState(
        {},
        document.title,
        window.location.pathname + window.location.search,
      );

      if (setErr) {
        throw new Error(setErr.message);
      }
    }
  }

  const load = async () => {
    setLoading(true);
    setError("");

    if (!inviteId) {
      setLoading(false);
      setError(
        "Invite link is missing invite_id. Please open the email again.",
      );
      return;
    }

    try {
      await ensureSessionFromHash();

      const { data } = await supabase.auth.getSession();
      const session = data?.session;

      if (!session) {
        setEmail("");
        setBusiness(null);
        setError("No active session. Please open the invite email again.");
        setLoading(false);
        return;
      }

      setEmail(session.user.email ?? "");

      const r = await fetch(
        `/api/invite/pending?invite_id=${encodeURIComponent(inviteId)}`,
        {
          cache: "no-store",
        },
      );
      const j = await r.json().catch(() => ({}));

      if (!r.ok) {
        setBusiness(null);
        setError(j?.error || "Failed to load invite");
      } else {
        setBusiness(j.business ?? null);
      }
    } catch (e: any) {
      setBusiness(null);
      setError(e?.message || "Failed to initialize session");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();

    const { data: sub } = supabase.auth.onAuthStateChange(() => {
      load();
    });

    return () => {
      sub.subscription.unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supabase, inviteId]);

  const canSubmit =
    fullName.trim().length > 1 &&
    phone.trim().length > 6 &&
    password.length >= 8 &&
    password === password2 &&
    !loading;

  const onSubmit = async () => {
    setError("");
    if (!canSubmit || submitting) return;

    try {
      setSubmitting(true);

      // 1) set password
      const { error: passErr } = await supabase.auth.updateUser({ password });
      if (passErr) {
        setError(passErr.message);
        return;
      }

      // 2) accept invite (server)
      const r = await fetch("/api/invite/accept", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          inviteId,
          fullName: fullName.trim(),
          phone: phone.trim(),
        }),
      });

      const j = await r.json().catch(() => ({}));
      if (!r.ok || !j?.ok) {
        setError(j?.error || "Failed to accept invite");
        return;
      }

      const businessSlug: string | undefined =
        j?.businessSlug || business?.slug;
      router.push(businessSlug ? `/b/${businessSlug}` : "/");
    } catch (e: any) {
      setError(e?.message || "Unexpected error");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/20 to-gray-50">
      <div className="mx-auto max-w-2xl px-4 py-10">
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm sm:p-8">
          <h1 className="text-xl font-semibold text-gray-900 sm:text-2xl">
            Complete your manager profile
          </h1>

          <p className="mt-2 text-sm text-gray-600">
            You&apos;re signing in as{" "}
            <span className="font-semibold text-gray-900">{email || "…"}</span>
          </p>

          {business?.slug && (
            <div className="mt-4 rounded-xl border border-gray-200 bg-gray-50 p-4">
              <div className="text-xs font-semibold text-gray-600">
                Invitation to
              </div>
              <div className="mt-1 text-base font-semibold text-gray-900">
                {business.name || business.slug}
              </div>
              <div className="mt-0.5 text-xs text-gray-500">
                /{business.slug}
              </div>
            </div>
          )}

          {error && (
            <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          {loading ? (
            <div className="mt-6 text-sm text-gray-500">Loading…</div>
          ) : (
            <div className="mt-6 space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-700">
                  Full name
                </label>
                <input
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="John Doe"
                  className="mt-2 w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                />
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700">
                  Phone
                </label>
                <input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+380…"
                  className="mt-2 w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                />
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700">
                  Password
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Min 8 characters"
                  className="mt-2 w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                />
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700">
                  Confirm password
                </label>
                <input
                  type="password"
                  value={password2}
                  onChange={(e) => setPassword2(e.target.value)}
                  placeholder="Repeat password"
                  className="mt-2 w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                />
                {password && password2 && password !== password2 && (
                  <div className="mt-2 text-xs text-red-600">
                    Passwords do not match
                  </div>
                )}
              </div>

              <button
                onClick={onSubmit}
                disabled={submitting || !canSubmit}
                className={[
                  "mt-2 w-full rounded-xl py-3 text-sm font-semibold transition-all",
                  submitting
                    ? "bg-gray-200 text-gray-500 cursor-wait"
                    : !canSubmit
                      ? "bg-gray-100 text-gray-500 cursor-not-allowed"
                      : "bg-black text-white hover:bg-gray-900 active:scale-[0.99] shadow-sm",
                ].join(" ")}
              >
                {submitting ? "Saving…" : "Continue"}
              </button>

              <p className="text-xs text-gray-500">
                After saving, you&apos;ll be redirected to the business
                dashboard.
              </p>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
