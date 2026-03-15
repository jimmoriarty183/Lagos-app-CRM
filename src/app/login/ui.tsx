"use client";

import React from "react";
import { useActionState } from "react";
import { useSearchParams } from "next/navigation";
import {
  loginAction,
  registerOwnerAction,
  forgotPasswordAction,
} from "@/app/actions/auth";
import { BUSINESS_SEGMENTS } from "@/lib/business-segments";

type State = { ok: boolean; error: string; next: string };
const initialState: State = { ok: false, error: "", next: "" };
type AuthAction = (prev: State, formData: FormData) => Promise<State>;

function ErrorBox({ text }: { text?: string }) {
  if (!text) return null;
  return (
    <div className="rounded-2xl border border-red-200/80 bg-red-50/90 px-3.5 py-2.5 text-xs text-red-700 shadow-sm">
      {text}
    </div>
  );
}

function SuccessBox({ text }: { text?: string }) {
  if (!text) return null;
  return (
    <div className="rounded-2xl border border-emerald-200/80 bg-emerald-50/90 px-3.5 py-2.5 text-xs text-emerald-800 shadow-sm">
      {text}
    </div>
  );
}

function OverlayLoader({ text }: { text: string }) {
  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center rounded-[20px] bg-white/70 backdrop-blur-sm">
      <div className="flex flex-col items-center gap-3 rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-lg shadow-slate-900/5">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-300 border-t-blue-700" />
        <div className="text-sm font-semibold text-slate-800">{text}</div>
      </div>
    </div>
  );
}

function Hint({ children }: { children: React.ReactNode }) {
  return <div className="text-xs leading-snug text-slate-500">{children}</div>;
}

function Input({
  label,
  name,
  type = "text",
  placeholder,
  required,
  autoComplete,
  value,
  onChange,
}: {
  label: string;
  name: string;
  type?: string;
  placeholder?: string;
  required?: boolean;
  autoComplete?: string;
  value?: string;
  onChange?: (v: string) => void;
}) {
  return (
    <label className="block">
      <div className="mb-1.5 text-[13px] font-semibold text-slate-700">{label}</div>
      <input
        name={name}
        type={type}
        required={required}
        autoComplete={autoComplete}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange?.(e.target.value)}
        className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 hover:border-slate-300 focus:border-blue-600 focus:ring-4 focus:ring-blue-100"
      />
    </label>
  );
}

function Select({
  label,
  name,
  required,
  value,
  onChange,
  options,
  placeholder,
}: {
  label: string;
  name: string;
  required?: boolean;
  value?: string;
  onChange?: (v: string) => void;
  options: readonly string[];
  placeholder: string;
}) {
  return (
    <label className="block">
      <div className="mb-1.5 text-[13px] font-semibold text-slate-700">{label}</div>
      <select
        name={name}
        required={required}
        value={value}
        onChange={(e) => onChange?.(e.target.value)}
        className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-sm text-slate-900 outline-none transition hover:border-slate-300 focus:border-blue-600 focus:ring-4 focus:ring-blue-100"
      >
        <option value="">{placeholder}</option>
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </label>
  );
}

function PasswordInput({
  label,
  name,
  required,
  autoComplete,
  placeholder,
  value,
  onChange,
  show,
  onToggleShow,
}: {
  label: string;
  name: string;
  required?: boolean;
  autoComplete?: string;
  placeholder?: string;
  value?: string;
  onChange?: (v: string) => void;
  show?: boolean;
  onToggleShow?: () => void;
}) {
  const [localShow, setLocalShow] = React.useState(false);

  const isControlled = typeof show === "boolean";
  const isShown = isControlled ? (show as boolean) : localShow;

  return (
    <label className="block">
      <div className="mb-1.5 text-[13px] font-semibold text-slate-700">{label}</div>
      <div className="relative">
        <input
          name={name}
          type={isShown ? "text" : "password"}
          required={required}
          autoComplete={autoComplete}
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange?.(e.target.value)}
          className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-3.5 pr-[4.75rem] text-sm text-slate-900 outline-none transition placeholder:text-slate-400 hover:border-slate-300 focus:border-blue-600 focus:ring-4 focus:ring-blue-100"
        />
        <button
          type="button"
          onClick={() => {
            if (isControlled) onToggleShow?.();
            else setLocalShow((s) => !s);
          }}
          className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-semibold text-slate-600 transition hover:border-slate-300 hover:bg-white hover:text-slate-900"
        >
          {isShown ? "Hide" : "Show"}
        </button>
      </div>
    </label>
  );
}

export default function LoginUI() {
  const [mode, setMode] = React.useState<"login" | "register" | "reset">(
    "login",
  );

  const [loginState, loginSubmit, loginPending] = useActionState(
    loginAction as AuthAction,
    initialState,
  );
  const [regState, regSubmit, regPending] = useActionState(
    registerOwnerAction as AuthAction,
    initialState,
  );
  const [resetState, resetSubmit, resetPending] = useActionState(
    forgotPasswordAction as AuthAction,
    initialState,
  );

  const sp = useSearchParams();
  const inviteId = sp.get("invite_id") || "";

  const [businessName, setBusinessName] = React.useState("");
  const [businessSegment, setBusinessSegment] = React.useState("");
  const [firstName, setFirstName] = React.useState("");
  const [lastName, setLastName] = React.useState("");
  const [emailReg, setEmailReg] = React.useState("");
  const [passReg, setPassReg] = React.useState("");
  const [passConfirm, setPassConfirm] = React.useState("");
  const [agree, setAgree] = React.useState(false);

  const [showRegPasswords, setShowRegPasswords] = React.useState(false);

  const [emailLogin, setEmailLogin] = React.useState("");
  const [passLogin, setPassLogin] = React.useState("");

  const [emailReset, setEmailReset] = React.useState("");

  const [localError, setLocalError] = React.useState("");

  const didRedirect = React.useRef(false);

  React.useEffect(() => {
    const next = loginState?.ok ? loginState.next : "";
    if (next) window.location.href = next;
  }, [loginState]);

  React.useEffect(() => {
    const next = regState?.ok ? regState.next : "";
    if (!next || didRedirect.current) return;

    (async () => {
      try {
        if (inviteId) {
          const fullName = `${firstName} ${lastName}`.trim();
          const res = await fetch("/api/invite/accept", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ inviteId, fullName }),
          });
          const json = await res.json().catch(() => ({}));
          if (json?.ok && json?.next) {
            didRedirect.current = true;
            window.location.href = json.next;
            return;
          }
        }
      } catch {
        // ignore
      }

      didRedirect.current = true;
      window.location.href = next;
    })();
  }, [regState, inviteId, firstName, lastName]);

  const activeState =
    mode === "login" ? loginState : mode === "register" ? regState : resetState;


  function validateRegister(): string {
    const bn = businessName.trim();
    const fn = firstName.trim();
    const ln = lastName.trim();
    const em = emailReg.trim();

    if (!inviteId && !bn) return "Enter your business name";
    if (!fn) return "Enter your first name";
    if (!ln) return "Enter your last name";
    if (!em) return "Enter your email";
    if (!passReg) return "Create a password";
    if (!passConfirm) return "Confirm your password";
    if (passReg !== passConfirm) return "Passwords do not match";
    if (!agree) return "Please accept the Terms & Privacy Policy";
    return "";
  }

  function onRegisterSubmit(e: React.FormEvent<HTMLFormElement>) {
    setLocalError("");
    const err = validateRegister();
    if (err) {
      e.preventDefault();
      setLocalError(err);
    }
  }

  function onResetSubmit(e: React.FormEvent<HTMLFormElement>) {
    setLocalError("");
    if (!emailReset.trim()) {
      e.preventDefault();
      setLocalError("Enter your email");
    }
  }

  return (
    <div className="relative overflow-hidden rounded-[20px] border border-white/70 bg-white/95 shadow-[0_28px_80px_-36px_rgba(15,23,42,0.38),0_10px_24px_-18px_rgba(15,23,42,0.26)] backdrop-blur-sm">
      {regPending && (
        <OverlayLoader
          text={inviteId ? "Joining business…" : "Creating your account…"}
        />
      )}
      {loginPending && <OverlayLoader text="Signing in…" />}
      {resetPending && <OverlayLoader text="Sending reset link…" />}

      <div className="border-b border-slate-100/80 px-6 pb-5 pt-6 sm:px-7">
        <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">
          ORDERO
        </div>

        <h1 className="mt-2 text-[1.65rem] font-semibold tracking-tight text-slate-900">
          {mode === "login"
            ? "Sign in"
            : mode === "register"
              ? "Create an account"
              : "Reset password"}
        </h1>

        <p className="mt-1.5 text-sm leading-relaxed text-slate-600">
          {mode === "login"
            ? "Sign in to access your Ordero business workspace."
            : mode === "register"
              ? inviteId
                ? "Create your account to join your team's workspace."
                : "Set up your account and create your first business workspace."
              : "We will email you a secure link to reset your password."}
        </p>

        {mode !== "reset" ? (
          <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50 p-1">
            <div className="grid grid-cols-2 gap-1">
              <button
                type="button"
                onClick={() => {
                  setMode("login");
                  setLocalError("");
                }}
                className={[
                  "rounded-[10px] px-3 py-2 text-xs font-semibold transition",
                  mode === "login"
                    ? "bg-white text-slate-900 shadow-sm shadow-slate-900/5"
                    : "text-slate-600 hover:text-slate-900",
                ].join(" ")}
              >
                Sign in
              </button>
              <button
                type="button"
                onClick={() => {
                  setMode("register");
                  setLocalError("");
                }}
                className={[
                  "rounded-[10px] px-3 py-2 text-xs font-semibold transition",
                  mode === "register"
                    ? "bg-white text-slate-900 shadow-sm shadow-slate-900/5"
                    : "text-slate-600 hover:text-slate-900",
                ].join(" ")}
              >
                Create account
              </button>
            </div>
          </div>
        ) : (
          <div className="mt-4">
            <button
              type="button"
              onClick={() => {
                setMode("login");
                setLocalError("");
              }}
              className="text-xs font-semibold text-slate-600 transition hover:text-slate-900"
            >
              ← Back to sign in
            </button>
          </div>
        )}
      </div>

      <div className="space-y-4 px-6 pb-6 pt-5 sm:px-7 sm:pb-7">
        <ErrorBox text={localError} />
        <ErrorBox text={activeState?.error} />

        {mode === "reset" && resetState?.ok ? (
          <SuccessBox text="If this email exists in our system, we sent a reset link. Please check your inbox and Spam folder." />
        ) : null}

        {mode === "login" ? (
          <form action={loginSubmit} className="space-y-4">
            <input type="hidden" name="invite_id" value={inviteId} />

            <Input
              label="Email"
              name="email"
              type="email"
              required
              autoComplete="email"
              placeholder="name@company.com"
              value={emailLogin}
              onChange={setEmailLogin}
            />

            <PasswordInput
              label="Password"
              name="password"
              required
              autoComplete="current-password"
              placeholder="Enter your password"
              value={passLogin}
              onChange={setPassLogin}
            />

            <div className="flex items-center justify-end">
              <button
                type="button"
                onClick={() => {
                  setMode("reset");
                  setLocalError("");
                  setEmailReset(emailLogin);
                }}
                className="text-xs font-semibold text-slate-600 transition hover:text-blue-700"
              >
                Forgot password?
              </button>
            </div>

            <button
              type="submit"
              disabled={loginPending}
              className="h-11 w-full rounded-xl bg-blue-700 px-4 text-sm font-semibold !text-white shadow-[0_10px_20px_-12px_rgba(29,78,216,0.9)] transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-60 disabled:!text-white"
            >
              Sign in
            </button>
          </form>
        ) : mode === "register" ? (
          <form action={regSubmit} onSubmit={onRegisterSubmit} className="space-y-4">
            <input type="hidden" name="invite_id" value={inviteId} />
            <input type="hidden" name="agree" value={agree ? "on" : ""} />

            {!inviteId && (
              <>
                <Input
                  label="Business name"
                  name="business_name"
                  required
                  placeholder="Acme Operations"
                  value={businessName}
                  onChange={setBusinessName}
                />

                <Select
                  label="Business segment"
                  name="business_segment"
                  value={businessSegment}
                  onChange={setBusinessSegment}
                  options={BUSINESS_SEGMENTS}
                  placeholder="Select your business segment"
                />
                <Hint>
                  Recommended for setup. Everything else can be added later in business settings.
                </Hint>
              </>
            )}

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Input
                label="First name"
                name="first_name"
                required
                placeholder="Ada"
                value={firstName}
                onChange={setFirstName}
              />
              <Input
                label="Last name"
                name="last_name"
                required
                placeholder="Okafor"
                value={lastName}
                onChange={setLastName}
              />
            </div>

            <Input
              label="Email"
              name="email"
              type="email"
              required
              autoComplete="email"
              placeholder="you@company.com"
              value={emailReg}
              onChange={setEmailReg}
            />

            <PasswordInput
              label="Password"
              name="password"
              required
              autoComplete="new-password"
              placeholder="Create a password"
              value={passReg}
              onChange={setPassReg}
              show={showRegPasswords}
              onToggleShow={() => setShowRegPasswords((s) => !s)}
            />

            <PasswordInput
              label="Confirm password"
              name="password_confirm"
              required
              autoComplete="new-password"
              placeholder="Repeat your password"
              value={passConfirm}
              onChange={setPassConfirm}
              show={showRegPasswords}
              onToggleShow={() => setShowRegPasswords((s) => !s)}
            />

            <label className="flex items-start gap-2.5 rounded-xl border border-slate-200 bg-slate-50/90 px-3.5 py-3">
              <input
                type="checkbox"
                checked={agree}
                onChange={(e) => setAgree(e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-slate-300 text-blue-700 focus:ring-blue-200"
              />
              <div className="text-xs leading-snug text-slate-700">
                I agree to the{" "}
                <a href="/terms" className="font-semibold text-blue-700 hover:underline">
                  Terms of Service
                </a>{" "}
                and{" "}
                <a href="/privacy" className="font-semibold text-blue-700 hover:underline">
                  Privacy Policy
                </a>
                .
              </div>
            </label>

            <button
              type="submit"
              disabled={regPending || !agree}
              className="h-11 w-full rounded-xl bg-blue-700 px-4 text-sm font-semibold !text-white shadow-[0_10px_20px_-12px_rgba(29,78,216,0.9)] transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-60 disabled:!text-white"
            >
              {inviteId ? "Create account & join" : "Create account"}
            </button>
          </form>
        ) : (
          <form action={resetSubmit} onSubmit={onResetSubmit} className="space-y-4">
            <Input
              label="Email"
              name="email"
              type="email"
              required
              autoComplete="email"
              placeholder="name@company.com"
              value={emailReset}
              onChange={setEmailReset}
            />

            <Hint>
              We&apos;ll email a secure reset link to this address. Check spam if needed.
            </Hint>

            <button
              type="submit"
              disabled={resetPending}
              className="h-11 w-full rounded-xl bg-blue-700 px-4 text-sm font-semibold !text-white shadow-[0_10px_20px_-12px_rgba(29,78,216,0.9)] transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-60 disabled:!text-white"
            >
              Send reset link
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
