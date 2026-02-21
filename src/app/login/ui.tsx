"use client";

import React from "react";
import { useActionState } from "react";

import { loginAction, registerOwnerAction } from "@/app/actions/auth";

type State = { ok: boolean; error: string; next: string };
const initialState: State = { ok: false, error: "", next: "" };

function ErrorBox({ text }: { text?: string }) {
  if (!text) return null;
  return (
    <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
      {text}
    </div>
  );
}

function Hint({ children }: { children: React.ReactNode }) {
  return <div className="text-xs text-gray-500">{children}</div>;
}

function cleanPhone(raw: string) {
  // оставляем + и цифры
  return raw.replace(/[^\d+]/g, "");
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
  const isTel = type === "tel";

  return (
    <label className="block">
      <div className="text-sm font-medium text-gray-700">{label}</div>
      <input
        name={name}
        type={type}
        required={required}
        autoComplete={autoComplete}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange?.(e.target.value)}
        inputMode={isTel ? "numeric" : undefined}
        className="mt-1 w-full rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-200"
      />
    </label>
  );
}

export default function LoginUI() {
  const [mode, setMode] = React.useState<"login" | "register">("login");

  const [loginState, loginSubmit, loginPending] = useActionState(
    loginAction as any,
    initialState,
  );
  const [regState, regSubmit, regPending] = useActionState(
    registerOwnerAction as any,
    initialState,
  );

  // local controlled fields for REGISTER (for validation + preview)
  const [businessName, setBusinessName] = React.useState("");
  const [ownerPhone, setOwnerPhone] = React.useState("");
  const [emailReg, setEmailReg] = React.useState("");
  const [passReg, setPassReg] = React.useState("");

  // local controlled fields for LOGIN (optional, just for nicer UX)
  const [emailLogin, setEmailLogin] = React.useState("");
  const [passLogin, setPassLogin] = React.useState("");

  // local error for client-side validation
  const [localError, setLocalError] = React.useState<string>("");

  React.useEffect(() => {
    const next = loginState?.ok ? loginState.next : "";
    if (next) window.location.href = next;
  }, [loginState]);

  React.useEffect(() => {
    const next = regState?.ok ? regState.next : "";
    if (next) window.location.href = next;
  }, [regState]);

  const activeState = mode === "login" ? loginState : regState;
  const pending = mode === "login" ? loginPending : regPending;

  const previewSlug = slugifyPreview(businessName);

  function validateRegister(): string {
    const bn = businessName.trim();
    const em = emailReg.trim();
    const ph = cleanPhone(ownerPhone.trim());

    if (!bn) return "Введите название бизнеса";
    if (bn.includes("@")) return "Название бизнеса не должно быть email";
    if (!em) return "Введите email";
    if (!passReg) return "Введите пароль";

    if (ph && !/^\+?[0-9]{8,15}$/.test(ph)) {
      return "Некорректный номер телефона (8–15 цифр, можно с +)";
    }

    return "";
  }

  function onRegisterSubmit(e: React.FormEvent<HTMLFormElement>) {
    setLocalError("");
    const err = validateRegister();
    if (err) {
      e.preventDefault();
      setLocalError(err);
      return;
    }

    // нормализуем телефон перед отправкой
    setOwnerPhone(cleanPhone(ownerPhone));
  }

  return (
    <div className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
      {/* Header */}
      <div className="p-6 border-b border-gray-100">
        <div className="text-xs font-semibold tracking-wider text-gray-500">
          ORDERO
        </div>
        <div className="mt-1 text-2xl font-bold text-gray-900">
          {mode === "login" ? "Вход" : "Регистрация"}
        </div>
        <div className="mt-1 text-sm text-gray-600">
          {mode === "login"
            ? "Войди в аккаунт и открой свой бизнес."
            : "Создай аккаунт и первый бизнес (Owner)."}
        </div>

        {/* Tabs */}
        <div className="mt-4 grid grid-cols-2 rounded-xl bg-gray-100 p-1">
          <button
            type="button"
            onClick={() => {
              setMode("login");
              setLocalError("");
            }}
            className={[
              "rounded-lg px-3 py-2 text-sm font-semibold transition",
              mode === "login"
                ? "bg-white shadow-sm text-gray-900"
                : "text-gray-600 hover:text-gray-900",
            ].join(" ")}
          >
            Вход
          </button>
          <button
            type="button"
            onClick={() => {
              setMode("register");
              setLocalError("");
            }}
            className={[
              "rounded-lg px-3 py-2 text-sm font-semibold transition",
              mode === "register"
                ? "bg-white shadow-sm text-gray-900"
                : "text-gray-600 hover:text-gray-900",
            ].join(" ")}
          >
            Регистрация
          </button>
        </div>
      </div>

      {/* Body */}
      <div className="p-6 space-y-4">
        {/* local client-side error first */}
        <ErrorBox text={localError} />
        {/* server action error */}
        <ErrorBox text={activeState?.error} />

        {mode === "login" ? (
          <form action={loginSubmit} className="space-y-3">
            <Input
              label="Email"
              name="email"
              type="email"
              required
              autoComplete="email"
              placeholder="you@email.com"
              value={emailLogin}
              onChange={setEmailLogin}
            />
            <Input
              label="Пароль"
              name="password"
              type="password"
              required
              autoComplete="current-password"
              placeholder="••••••••"
              value={passLogin}
              onChange={setPassLogin}
            />

            <button
              type="submit"
              disabled={pending}
              className="w-full rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold !text-white hover:bg-blue-700 disabled:opacity-60 disabled:!text-white"
            >
              {pending ? "Входим..." : "Войти"}
            </button>
          </form>
        ) : (
          <form
            action={regSubmit}
            onSubmit={onRegisterSubmit}
            className="space-y-3"
          >
            <Input
              label="Название бизнеса"
              name="business_name"
              required
              placeholder="My Shop"
              value={businessName}
              onChange={setBusinessName}
            />
            <Hint>
              Ссылка будет выглядеть так:{" "}
              <span className="font-semibold text-gray-700">
                /b/{previewSlug}
              </span>
            </Hint>

            <Input
              label="Owner phone (optional)"
              name="owner_phone"
              type="tel"
              autoComplete="tel"
              placeholder="+380..."
              value={ownerPhone}
              onChange={(v) => setOwnerPhone(cleanPhone(v))}
            />
            <Hint>Только цифры, можно с +. Пример: +380991234567</Hint>

            <Input
              label="Email"
              name="email"
              type="email"
              required
              autoComplete="email"
              placeholder="you@email.com"
              value={emailReg}
              onChange={setEmailReg}
            />

            <Input
              label="Пароль"
              name="password"
              type="password"
              required
              autoComplete="new-password"
              placeholder="••••••••"
              value={passReg}
              onChange={setPassReg}
            />

            <button
              type="submit"
              disabled={pending}
              className="w-full rounded-xl bg-gray-900 px-4 py-2.5 text-sm font-semibold !text-white hover:bg-black disabled:opacity-60 disabled:!text-white"
            >
              {pending ? "Создаём..." : "Создать аккаунт"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
