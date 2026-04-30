"use client";

import React from "react";
import { useActionState } from "react";
import { useSearchParams } from "next/navigation";
import { updatePasswordAction } from "@/app/actions/auth";
import { LoginBrand } from "@/components/Brand";
import { createClient } from "@/lib/supabase/client";

type State = { ok: boolean; error: string; next: string };
const initialState: State = { ok: false, error: "", next: "" };

function ErrorBox({ text }: { text?: string }) {
  if (!text) return null;
  return (
    <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
      {text}
    </div>
  );
}

function SuccessBox({ text }: { text?: string }) {
  if (!text) return null;
  return (
    <div className="rounded-xl border border-green-200 bg-green-50 px-3 py-2 text-xs text-green-800">
      {text}
    </div>
  );
}

function PasswordInput({
  label,
  name,
  value,
  onChange,
}: {
  label: string;
  name: string;
  value: string;
  onChange: (v: string) => void;
}) {
  const [show, setShow] = React.useState(false);

  return (
    <label className="block">
      <div className="text-xs font-medium text-gray-700 dark:text-white/80">{label}</div>
      <div className="relative mt-1">
        <input
          name={name}
          type={show ? "text" : "password"}
          required
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full rounded-xl border border-gray-300 dark:border-white/15 bg-white dark:bg-white/[0.03] px-3 py-2 pr-11 text-sm outline-none focus:ring-2 focus:ring-blue-200"
        />
        <button
          type="button"
          onClick={() => setShow((s) => !s)}
          className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg px-2 py-1 text-[11px] font-semibold text-gray-600 dark:text-white/70 hover:bg-gray-100 hover:text-gray-900"
        >
          {show ? "Hide" : "Show"}
        </button>
      </div>
    </label>
  );
}

export default function ResetPasswordUI() {
  const supabase = React.useMemo(() => createClient(), []);
  const searchParams = useSearchParams();
  const [state, submit, pending] = useActionState(
    updatePasswordAction as never,
    initialState,
  );

  const [booting, setBooting] = React.useState(true);
  const [pass1, setPass1] = React.useState("");
  const [pass2, setPass2] = React.useState("");
  const [localError, setLocalError] = React.useState("");

  React.useEffect(() => {
    let active = true;

    async function initRecoverySession() {
      if (searchParams.get("error") === "recovery_link_invalid") {
        if (active) {
          setLocalError(
            "Recovery link is invalid or expired. Please request a new reset email.",
          );
          setBooting(false);
        }
        return;
      }

      const { data } = await supabase.auth.getSession();
      if (!active) return;

      if (!data.session) {
        setLocalError("Open the password reset link from the email again.");
      }

      setBooting(false);
    }

    void initRecoverySession();

    return () => {
      active = false;
    };
  }, [searchParams, supabase]);

  React.useEffect(() => {
    if (state?.ok && state.next) {
      window.location.href = state.next;
    }
  }, [state]);

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    setLocalError("");

    if (!pass1 || pass1.length < 6) {
      e.preventDefault();
      setLocalError("Password must be at least 6 characters.");
      return;
    }

    if (pass1 !== pass2) {
      e.preventDefault();
      setLocalError("Passwords do not match.");
    }
  }

  return (
    <div className="w-full overflow-hidden rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/[0.03] shadow-sm">
      <div className="border-b border-gray-100 dark:border-white/[0.06] p-4">
        <LoginBrand variant="dark" height={24} />
        <div className="mt-1 text-xl font-bold text-gray-900 dark:text-white">
          Create a new password
        </div>
        <div className="mt-0.5 text-xs text-gray-600 dark:text-white/70">
          Set a new password for your account and continue to your Ordo
          workspace.
        </div>
      </div>

      <div className="space-y-3 p-4">
        <ErrorBox text={localError} />
        <ErrorBox text={state?.error} />
        {state?.ok ? (
          <SuccessBox text="Password updated. Redirecting to sign in..." />
        ) : null}

        <form action={submit} onSubmit={onSubmit} className="space-y-2.5">
          <PasswordInput
            label="New password"
            name="password"
            value={pass1}
            onChange={setPass1}
          />
          <PasswordInput
            label="Repeat password"
            name="password_confirm"
            value={pass2}
            onChange={setPass2}
          />

          <button
            type="submit"
            disabled={pending || booting}
            className="w-full rounded-xl bg-gray-900 px-4 py-2 text-sm font-semibold !text-white hover:bg-black disabled:opacity-60 disabled:!text-white"
          >
            {booting
              ? "Checking link..."
              : pending
                ? "Saving..."
                : "Save password"}
          </button>
        </form>
      </div>
    </div>
  );
}
