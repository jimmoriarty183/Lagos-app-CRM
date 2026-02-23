"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type BusinessInfo = {
  id: string;
  slug: string;
  name?: string | null;
};

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

    const { data } = await supabase.auth.getSession();
    const session = data?.session;

    if (!session) {
      setLoading(false);
      setEmail("");
      setBusiness(null);
      setError(
        "No active session. Please open the invite email and confirm again.",
      );
      return;
    }

    setEmail(session.user.email ?? "");

    try {
      const r = await fetch(
        `/api/invite/pending?invite_id=${encodeURIComponent(inviteId)}`,
        {
          cache: "no-store",
        },
      );
      const j = await r.json();

      if (r.ok) {
        setBusiness(j.business ?? null);
      } else {
        setBusiness(null);
        setError(j?.error || "Failed to load invite");
      }
    } catch {
      setBusiness(null);
      setError("Failed to load invite");
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
    password === password2;

  const onSubmit = async () => {
    setError("");
    if (!canSubmit || submitting) return;

    try {
      setSubmitting(true);

      // 1) set password (create account fully)
      const { error: passErr } = await supabase.auth.updateUser({ password });
      if (passErr) {
        setError(passErr.message);
        return;
      }

      // 2) accept invite
      const r = await fetch(
        `/api/invite/accept?invite_id=${encodeURIComponent(inviteId)}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            inviteId,
            fullName: fullName.trim(),
            phone: phone.trim(),
          }),
        },
      );

      const j = await r.json();

      if (!r.ok) {
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
        <div className="rounded-2xl border border-gray-200 bg-white shadow-sm p-6 sm:p-8">
          <h1 className="text-xl sm:text-2xl font-semibold text-gray-900">
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
                className={`
                  mt-2 w-full rounded-xl py-3 text-sm font-semibold transition-all
                  ${
                    submitting || !canSubmit
                      ? "bg-gray-200 text-gray-400 cursor-not-allowed"
                      : "bg-blue-600 text-white hover:bg-blue-700 shadow-sm"
                  }
                `}
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
