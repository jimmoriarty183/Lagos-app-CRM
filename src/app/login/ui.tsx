"use client";

import React from "react";
import { useActionState } from "react";
import { useSearchParams } from "next/navigation";
import {
  loginAction,
  registerOwnerAction,
  forgotPasswordAction,
} from "@/app/actions/auth";

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

function OverlayLoader({ text }: { text: string }) {
  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-white/70 backdrop-blur-sm rounded-2xl">
      <div className="flex flex-col items-center gap-3">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-gray-300 border-t-blue-600" />
        <div className="text-sm font-semibold text-gray-800">{text}</div>
      </div>
    </div>
  );
}

function Hint({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-[11px] leading-snug text-gray-500">{children}</div>
  );
}

function slugifyPreview(input: string) {
  const base = String(input || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
  return base || "my-business";
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
      <div className="text-xs font-medium text-gray-700">{label}</div>
      <input
        name={name}
        type={type}
        required={required}
        autoComplete={autoComplete}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange?.(e.target.value)}
        className="mt-1 w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-200"
      />
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
}: {
  label: string;
  name: string;
  required?: boolean;
  autoComplete?: string;
  placeholder?: string;
  value?: string;
  onChange?: (v: string) => void;
}) {
  const [show, setShow] = React.useState(false);

  return (
    <label className="block">
      <div className="text-xs font-medium text-gray-700">{label}</div>
      <div className="mt-1 relative">
        <input
          name={name}
          type={show ? "text" : "password"}
          required={required}
          autoComplete={autoComplete}
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange?.(e.target.value)}
          className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 pr-11 text-sm outline-none focus:ring-2 focus:ring-blue-200"
        />
        <button
          type="button"
          onClick={() => setShow((s) => !s)}
          className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg px-2 py-1 text-[11px] font-semibold text-gray-600 hover:text-gray-900 hover:bg-gray-100"
        >
          {show ? "Hide" : "Show"}
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
    loginAction as any,
    initialState,
  );
  const [regState, regSubmit, regPending] = useActionState(
    registerOwnerAction as any,
    initialState,
  );
  const [resetState, resetSubmit, resetPending] = useActionState(
    forgotPasswordAction as any,
    initialState,
  );

  const sp = useSearchParams();
  const inviteId = sp.get("invite_id") || "";

  const [businessName, setBusinessName] = React.useState("");
  const [firstName, setFirstName] = React.useState("");
  const [lastName, setLastName] = React.useState("");
  const [emailReg, setEmailReg] = React.useState("");
  const [passReg, setPassReg] = React.useState("");
  const [passConfirm, setPassConfirm] = React.useState("");
  const [agree, setAgree] = React.useState(false);

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
        // Invite accept is handled on /invite page in your flow,
        // but if you want to do it here too, keep this:
        // (we keep it safe; if fails - fallback to next)
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

  const previewSlug = slugifyPreview(businessName);

  function validateRegister(): string {
    const bn = businessName.trim();
    const fn = firstName.trim();
    const ln = lastName.trim();
    const em = emailReg.trim();

    // если invite — бизнес может не требоваться (зависит от твоей логики, но так правильно)
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
    <div className="relative rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
      {regPending && (
        <OverlayLoader
          text={inviteId ? "Joining business…" : "Creating your account…"}
        />
      )}
      {loginPending && <OverlayLoader text="Signing in…" />}
      {resetPending && <OverlayLoader text="Sending reset link…" />}

      {/* Header */}
      <div className="p-4 border-b border-gray-100">
        <div className="text-[11px] font-semibold tracking-wider text-gray-500">
          ORDERO
        </div>

        <div className="mt-1 text-xl font-bold text-gray-900">
          {mode === "login"
            ? "Sign in"
            : mode === "register"
              ? "Create an account"
              : "Reset password"}
        </div>

        <div className="mt-0.5 text-xs text-gray-600">
          {mode === "login"
            ? "Sign in to access your workspace."
            : mode === "register"
              ? inviteId
                ? "Create an account to join the business."
                : "Create an account and your first business (Owner)."
              : "We will email you a password reset link."}
        </div>

        {mode !== "reset" ? (
          <div className="mt-3 grid grid-cols-2 rounded-xl bg-gray-100 p-1">
            <button
              type="button"
              onClick={() => {
                setMode("login");
                setLocalError("");
              }}
              className={[
                "rounded-lg px-3 py-1.5 text-xs font-semibold transition",
                mode === "login"
                  ? "bg-white shadow-sm text-gray-900"
                  : "text-gray-600 hover:text-gray-900",
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
                "rounded-lg px-3 py-1.5 text-xs font-semibold transition",
                mode === "register"
                  ? "bg-white shadow-sm text-gray-900"
                  : "text-gray-600 hover:text-gray-900",
              ].join(" ")}
            >
              Create account
            </button>
          </div>
        ) : (
          <div className="mt-3">
            <button
              type="button"
              onClick={() => {
                setMode("login");
                setLocalError("");
              }}
              className="text-xs font-semibold text-gray-700 hover:text-gray-900"
            >
              ← Back to sign in
            </button>
          </div>
        )}
      </div>

      {/* Body */}
      <div className="p-4 space-y-3">
        <ErrorBox text={localError} />
        <ErrorBox text={activeState?.error} />

        {mode === "reset" && resetState?.ok ? (
          <SuccessBox text="If this email exists in our system, we sent a reset link. Please check your inbox and Spam folder." />
        ) : null}

        {mode === "login" ? (
          <form action={loginSubmit} className="space-y-2.5">
            <Input
              label="Email"
              name="email"
              type="email"
              required
              autoComplete="email"
              placeholder="tunde@example.com"
              value={emailLogin}
              onChange={setEmailLogin}
            />

            <PasswordInput
              label="Password"
              name="password"
              required
              autoComplete="current-password"
              placeholder="••••••••"
              value={passLogin}
              onChange={setPassLogin}
            />

            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={() => {
                  setMode("reset");
                  setLocalError("");
                  setEmailReset(emailLogin);
                }}
                className="text-[11px] font-semibold text-gray-600 hover:text-gray-900"
              >
                Forgot password?
              </button>
            </div>

            <button
              type="submit"
              disabled={loginPending}
              className="w-full rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold !text-white hover:bg-blue-700 disabled:opacity-60 disabled:!text-white"
            >
              Sign in
            </button>

            <Hint>
              Nigeria phone format example:{" "}
              <span className="font-semibold text-gray-700">
                +234 803 123 4567
              </span>
            </Hint>
          </form>
        ) : mode === "register" ? (
          <form
            action={regSubmit}
            onSubmit={onRegisterSubmit}
            className="space-y-2.5"
          >
            {/* hidden fields for server-side */}
            <input type="hidden" name="invite_id" value={inviteId} />
            <input type="hidden" name="agree" value={agree ? "on" : ""} />

            {!inviteId && (
              <>
                <Input
                  label="Business name"
                  name="business_name"
                  required
                  placeholder="Sunrise Cleaning"
                  value={businessName}
                  onChange={setBusinessName}
                />
                <Hint>
                  Link:{" "}
                  <span className="font-semibold text-gray-700">
                    /b/{previewSlug}
                  </span>
                </Hint>
              </>
            )}

            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <Input
                label="First name"
                name="first_name"
                required
                placeholder="Daniel"
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
              placeholder="daniel.okafor@email.com"
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
            />

            <PasswordInput
              label="Confirm password"
              name="password_confirm"
              required
              autoComplete="new-password"
              placeholder="Repeat your password"
              value={passConfirm}
              onChange={setPassConfirm}
            />

            <label className="flex items-start gap-2 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2">
              <input
                type="checkbox"
                checked={agree}
                onChange={(e) => setAgree(e.target.checked)}
                className="mt-1"
              />
              <div className="text-[12px] text-gray-700 leading-snug">
                I agree to the{" "}
                <a
                  href="/terms"
                  className="font-semibold text-blue-700 hover:underline"
                >
                  Terms of Service
                </a>{" "}
                and{" "}
                <a
                  href="/privacy"
                  className="font-semibold text-blue-700 hover:underline"
                >
                  Privacy Policy
                </a>
                .
              </div>
            </label>

            <button
              type="submit"
              disabled={regPending || !agree}
              className="w-full rounded-xl bg-gray-900 px-4 py-2 text-sm font-semibold !text-white hover:bg-black disabled:opacity-60 disabled:!text-white"
            >
              {inviteId ? "Create account & join" : "Create account"}
            </button>
          </form>
        ) : (
          <form
            action={resetSubmit}
            onSubmit={onResetSubmit}
            className="space-y-2.5"
          >
            <Input
              label="Email"
              name="email"
              type="email"
              required
              autoComplete="email"
              placeholder="tunde@example.com"
              value={emailReset}
              onChange={setEmailReset}
            />

            <Hint>
              We’ll email you a link to reset your password. If you don’t see
              it, check Spam.
            </Hint>

            <button
              type="submit"
              disabled={resetPending}
              className="w-full rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold !text-white hover:bg-blue-700 disabled:opacity-60 disabled:!text-white"
            >
              Send reset link
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
