"use client";

import React from "react";
import { useActionState } from "react";

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

function Hint({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-[11px] leading-snug text-gray-500">{children}</div>
  );
}

function cleanPhone(raw: string) {
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
      <div className="text-xs font-medium text-gray-700">{label}</div>
      <input
        name={name}
        type={type}
        required={required}
        autoComplete={autoComplete}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange?.(e.target.value)}
        inputMode={isTel ? "numeric" : undefined}
        className={[
          "mt-1 w-full rounded-xl border border-gray-300 bg-white",
          "px-3 py-2 text-sm outline-none",
          "focus:ring-2 focus:ring-blue-200",
        ].join(" ")}
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
          className={[
            "w-full rounded-xl border border-gray-300 bg-white",
            "px-3 py-2 pr-11 text-sm outline-none",
            "focus:ring-2 focus:ring-blue-200",
          ].join(" ")}
        />

        <button
          type="button"
          onClick={() => setShow((s) => !s)}
          aria-label={show ? "Скрыть пароль" : "Показать пароль"}
          className={[
            "absolute right-2 top-1/2 -translate-y-1/2",
            "rounded-lg px-2 py-1 text-[11px] font-semibold",
            "text-gray-600 hover:text-gray-900",
            "hover:bg-gray-100",
          ].join(" ")}
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

  const [businessName, setBusinessName] = React.useState("");
  const [ownerPhone, setOwnerPhone] = React.useState("");
  const [emailReg, setEmailReg] = React.useState("");
  const [passReg, setPassReg] = React.useState("");

  const [emailLogin, setEmailLogin] = React.useState("");
  const [passLogin, setPassLogin] = React.useState("");

  const [emailReset, setEmailReset] = React.useState("");

  const [localError, setLocalError] = React.useState<string>("");

  React.useEffect(() => {
    const next = loginState?.ok ? loginState.next : "";
    if (next) window.location.href = next;
  }, [loginState]);

  React.useEffect(() => {
    const next = regState?.ok ? regState.next : "";
    if (next) window.location.href = next;
  }, [regState]);

  const activeState =
    mode === "login" ? loginState : mode === "register" ? regState : resetState;

  const pending =
    mode === "login"
      ? loginPending
      : mode === "register"
        ? regPending
        : resetPending;

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
    setOwnerPhone(cleanPhone(ownerPhone));
  }

  function onResetSubmit(e: React.FormEvent<HTMLFormElement>) {
    setLocalError("");
    const em = emailReset.trim();
    if (!em) {
      e.preventDefault();
      setLocalError("Введите email");
    }
  }

  return (
    <div className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-gray-100">
        <div className="text-[11px] font-semibold tracking-wider text-gray-500">
          ORDERO
        </div>

        <div className="mt-1 text-xl font-bold text-gray-900">
          {mode === "login"
            ? "Вход"
            : mode === "register"
              ? "Регистрация"
              : "Восстановление"}
        </div>

        <div className="mt-0.5 text-xs text-gray-600">
          {mode === "login"
            ? "Войди в аккаунт и открой бизнес."
            : mode === "register"
              ? "Создай аккаунт и первый бизнес (Owner)."
              : "Мы отправим ссылку для смены пароля на email."}
        </div>

        {/* Tabs (скрываем на reset, там будет кнопка назад) */}
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
              Вход
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
              Регистрация
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
              ← Назад ко входу
            </button>
          </div>
        )}
      </div>

      {/* Body */}
      <div className="p-4 space-y-3">
        <ErrorBox text={localError} />
        <ErrorBox text={activeState?.error} />

        {/* успех для reset */}
        {mode === "reset" && resetState?.ok ? (
          <SuccessBox text="Если этот email зарегистрирован, мы отправили ссылку для восстановления. Проверьте почту и папку Спам." />
        ) : null}

        {mode === "login" ? (
          <form action={loginSubmit} className="space-y-2.5">
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

            <PasswordInput
              label="Пароль"
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
                  setEmailReset(emailLogin); // удобно подставить если уже введён
                }}
                className="text-[11px] font-semibold text-gray-600 hover:text-gray-900"
              >
                Забыли пароль?
              </button>
            </div>

            <button
              type="submit"
              disabled={pending}
              className="w-full rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold !text-white hover:bg-blue-700 disabled:opacity-60 disabled:!text-white"
            >
              {pending ? "Входим..." : "Войти"}
            </button>
          </form>
        ) : mode === "register" ? (
          <form
            action={regSubmit}
            onSubmit={onRegisterSubmit}
            className="space-y-2.5"
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
              Ссылка:{" "}
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
            <Hint>Цифры/+, пример: +380991234567</Hint>

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

            <PasswordInput
              label="Пароль"
              name="password"
              required
              autoComplete="new-password"
              placeholder="your password"
              value={passReg}
              onChange={setPassReg}
            />

            <button
              type="submit"
              disabled={pending}
              className="w-full rounded-xl bg-gray-900 px-4 py-2 text-sm font-semibold !text-white hover:bg-black disabled:opacity-60 disabled:!text-white"
            >
              {pending ? "Создаём..." : "Создать аккаунт"}
            </button>
          </form>
        ) : (
          // reset mode
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
              placeholder="you@email.com"
              value={emailReset}
              onChange={setEmailReset}
            />

            <Hint>
              Мы отправим письмо со ссылкой для смены пароля. Если письма нет —
              проверь “Спам”.
            </Hint>

            <button
              type="submit"
              disabled={pending}
              className="w-full rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold !text-white hover:bg-blue-700 disabled:opacity-60 disabled:!text-white"
            >
              {pending ? "Отправляем..." : "Отправить ссылку"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
