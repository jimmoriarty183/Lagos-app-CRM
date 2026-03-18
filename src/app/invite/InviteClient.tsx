"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type BusinessInfo = {
  id: string;
  slug: string;
  name?: string | null;
};

type CurrentUserInfo = {
  id: string;
  email?: string | null;
  full_name?: string | null;
  membershipsCount?: number;
};

function parseHashTokens(hash: string) {
  const h = (hash || "").replace(/^#/, "");
  const p = new URLSearchParams(h);
  const access_token = p.get("access_token") || "";
  const refresh_token = p.get("refresh_token") || "";
  return { access_token, refresh_token };
}

function Spinner() {
  return (
    <div className="h-5 w-5 animate-spin rounded-full border-2 border-gray-300 border-t-gray-900" />
  );
}

export default function InviteClient() {
  const router = useRouter();
  const sp = useSearchParams();
  const inviteId = sp.get("invite_id") || "";

  const supabase = useMemo(() => createClient(), []);

  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState<string>("");
  const [business, setBusiness] = useState<BusinessInfo | null>(null);
  const [currentUser, setCurrentUser] = useState<CurrentUserInfo | null>(null);

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [password, setPassword] = useState("");
  const [password2, setPassword2] = useState("");
  const [agree, setAgree] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string>("");

  const fullName = [firstName.trim(), lastName.trim()].filter(Boolean).join(" ");
  const isExistingAccount = (currentUser?.membershipsCount ?? 0) > 0;

  async function ensureSessionFromHash() {
    if (typeof window === "undefined") return;

    const { access_token, refresh_token } = parseHashTokens(window.location.hash);
    if (access_token && refresh_token) {
      const { error: setErr } = await supabase.auth.setSession({
        access_token,
        refresh_token,
      });

      window.history.replaceState(
        {},
        document.title,
        window.location.pathname + window.location.search,
      );

      if (setErr) throw new Error(setErr.message);
    }
  }

  const load = async () => {
    setLoading(true);
    setError("");

    if (!inviteId) {
      setLoading(false);
      setError("Invite link is missing invite_id. Please open the email again.");
      return;
    }

    try {
      await ensureSessionFromHash();

      const { data } = await supabase.auth.getSession();
      const session = data?.session;

      if (!session) {
        setEmail("");
        setBusiness(null);
        setCurrentUser(null);
        setError("No active session. Please sign in and open the invite again.");
        setLoading(false);
        return;
      }

      setEmail(session.user.email ?? "");

      const r = await fetch(
        `/api/invite/pending?invite_id=${encodeURIComponent(inviteId)}`,
        { cache: "no-store" },
      );
      const j = await r.json().catch(() => ({}));

      if (!r.ok) {
        setBusiness(null);
        setCurrentUser(null);
        setError(j?.error || "Failed to load invite");
      } else {
        setBusiness(j.business ?? null);
        setCurrentUser(j.currentUser ?? null);
      }
    } catch (e: any) {
      setBusiness(null);
      setCurrentUser(null);
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

  const canSubmitSetup =
    firstName.trim().length >= 2 &&
    lastName.trim().length >= 2 &&
    password.length >= 8 &&
    password === password2 &&
    agree &&
    !loading &&
    !submitting;

  const canAcceptExisting = !loading && !submitting;

  const finishAccept = async (payload: Record<string, unknown>) => {
    const r = await fetch("/api/invite/accept", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const j = await r.json().catch(() => ({}));
    if (!r.ok || !j?.ok) {
      throw new Error(j?.error || "Failed to accept invite");
    }

    const businessSlug: string | undefined = j?.businessSlug || business?.slug;
    router.push(businessSlug ? `/b/${businessSlug}` : "/");
  };

  const onAcceptExisting = async () => {
    setError("");
    if (!canAcceptExisting) return;

    try {
      setSubmitting(true);
      await finishAccept({ inviteId });
    } catch (e: any) {
      setError(e?.message || "Unexpected error");
    } finally {
      setSubmitting(false);
    }
  };

  const onSubmit = async () => {
    setError("");
    if (!canSubmitSetup || submitting) return;

    try {
      setSubmitting(true);

      const { error: passErr } = await supabase.auth.updateUser({ password });
      if (passErr) {
        setError(passErr.message);
        return;
      }

      await finishAccept({
        inviteId,
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        fullName,
      });
    } catch (e: any) {
      setError(e?.message || "Unexpected error");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main
      className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/20 to-gray-50"
      style={{ colorScheme: "light" }}
    >
      {submitting && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-white/70 backdrop-blur-sm">
          <div className="w-[92%] max-w-sm rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <Spinner />
              <div>
                <div className="text-sm font-semibold text-gray-900">
                  {isExistingAccount ? "Confirming access..." : "Finishing setup..."}
                </div>
                <div className="mt-0.5 text-xs text-gray-600">
                  {isExistingAccount
                    ? "Adding this business to your account."
                    : "Creating your manager access and redirecting."}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="mx-auto max-w-2xl px-4 py-10">
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm sm:p-8">
          <h1 className="text-xl font-semibold text-gray-900 sm:text-2xl">
            {isExistingAccount ? "Confirm manager access" : "Complete your manager profile"}
          </h1>

          <p className="mt-2 text-sm text-gray-600">
            You&apos;re signing in as{" "}
            <span className="font-semibold text-gray-900">{email || "..."}</span>
          </p>

          {business?.slug && (
            <div className="mt-4 rounded-xl border border-gray-200 bg-gray-50 p-4">
              <div className="text-xs font-semibold text-gray-600">Invitation to</div>
              <div className="mt-1 text-base font-semibold text-gray-900">
                {business.name || business.slug}
              </div>
              <div className="mt-0.5 text-xs text-gray-500">/{business.slug}</div>
            </div>
          )}

          {error && (
            <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          {loading ? (
            <div className="mt-6 flex items-center gap-3 text-sm text-gray-600">
              <Spinner />
              Loading invite...
            </div>
          ) : isExistingAccount ? (
            <div className="mt-6 space-y-4">
              <div className="rounded-xl border border-[#c7d2fe] bg-[#eef2ff] p-4">
                <div className="text-sm font-semibold text-gray-900">
                  Existing account detected
                </div>
                <div className="mt-1 text-sm text-gray-600">
                  This invite will add manager access for{" "}
                  <span className="font-semibold text-gray-900">
                    {business?.name || business?.slug || "this business"}
                  </span>{" "}
                  to your current account.
                </div>
                {currentUser?.full_name ? (
                  <div className="mt-2 text-xs text-gray-500">
                    Signed in as {currentUser.full_name}
                  </div>
                ) : null}
              </div>

              <button
                onClick={onAcceptExisting}
                disabled={!canAcceptExisting}
                className={[
                  "w-full rounded-xl py-3 text-sm font-semibold transition-all shadow-sm",
                  !canAcceptExisting
                    ? "bg-gray-200 text-gray-700 cursor-not-allowed"
                    : "bg-[#6366F1] text-white hover:bg-[#5558E6] active:scale-[0.99]",
                ].join(" ")}
              >
                Accept invite and open business
              </button>

              <p className="text-xs text-gray-500">
                Your account, password, and existing businesses stay unchanged.
              </p>
            </div>
          ) : (
            <div className="mt-6 space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="text-sm font-medium text-gray-700">
                    First name
                  </label>
                  <input
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    placeholder="John"
                    autoComplete="given-name"
                    className="mt-2 w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 outline-none placeholder:text-gray-400 focus:border-[#6366F1] focus:ring-2 focus:ring-[rgba(99,102,241,0.14)]"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-700">
                    Last name
                  </label>
                  <input
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    placeholder="Doe"
                    autoComplete="family-name"
                    className="mt-2 w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 outline-none placeholder:text-gray-400 focus:border-[#6366F1] focus:ring-2 focus:ring-[rgba(99,102,241,0.14)]"
                  />
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700">Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Min 8 characters"
                  autoComplete="new-password"
                  className="mt-2 w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 outline-none placeholder:text-gray-400 focus:border-[#6366F1] focus:ring-2 focus:ring-[rgba(99,102,241,0.14)]"
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
                  autoComplete="new-password"
                  className="mt-2 w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 outline-none placeholder:text-gray-400 focus:border-[#6366F1] focus:ring-2 focus:ring-[rgba(99,102,241,0.14)]"
                />
                {password && password2 && password !== password2 && (
                  <div className="mt-2 text-xs text-red-600">Passwords do not match</div>
                )}
              </div>

              <div className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3">
                <label className="flex cursor-pointer select-none items-start gap-3">
                  <input
                    type="checkbox"
                    checked={agree}
                    onChange={(e) => setAgree(e.target.checked)}
                    className="mt-1 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700">
                    I agree to the terms and conditions and privacy policy
                    <span className="text-gray-500"> (text will be updated)</span>
                  </span>
                </label>

                {!agree && (
                  <div className="mt-2 text-xs text-gray-500">
                    Please accept the agreement to continue.
                  </div>
                )}
              </div>

              <button
                onClick={onSubmit}
                disabled={!canSubmitSetup}
                className={[
                  "w-full rounded-xl py-3 text-sm font-semibold transition-all shadow-sm",
                  !canSubmitSetup
                    ? "bg-gray-200 text-gray-700 cursor-not-allowed"
                    : "bg-[#6366F1] text-white hover:bg-[#5558E6] active:scale-[0.99]",
                ].join(" ")}
              >
                Continue
              </button>

              <p className="text-xs text-gray-500">
                After saving, you&apos;ll be redirected to the business dashboard.
                {fullName ? (
                  <>
                    {" "}
                    Your name:{" "}
                    <span className="font-semibold text-gray-700">{fullName}</span>
                  </>
                ) : null}
              </p>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}


