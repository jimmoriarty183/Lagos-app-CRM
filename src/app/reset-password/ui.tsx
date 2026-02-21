"use client";

import React from "react";
import { useActionState } from "react";
import { updatePasswordAction } from "@/app/actions/auth";

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
      <div className="text-xs font-medium text-gray-700">{label}</div>
      <div className="mt-1 relative">
        <input
          name={name}
          type={show ? "text" : "password"}
          required
          value={value}
          onChange={(e) => onChange(e.target.value)}
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

export default function ResetPasswordUI() {
  const [state, submit, pending] = useActionState(
    updatePasswordAction as any,
    initialState,
  );

  const [pass1, setPass1] = React.useState("");
  const [pass2, setPass2] = React.useState("");
  const [localError, setLocalError] = React.useState("");

  React.useEffect(() => {
    if (state?.ok && state.next) window.location.href = state.next;
  }, [state]);

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    setLocalError("");
    if (!pass1 || pass1.length < 6) {
      e.preventDefault();
      setLocalError("Пароль должен быть минимум 6 символов");
      return;
    }
    if (pass1 !== pass2) {
      e.preventDefault();
      setLocalError("Пароли не совпадают");
      return;
    }
  }

  return (
    <div className="w-full rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
      <div className="p-4 border-b border-gray-100">
        <div className="text-[11px] font-semibold tracking-wider text-gray-500">
          ORDERO
        </div>
        <div className="mt-1 text-xl font-bold text-gray-900">Новый пароль</div>
        <div className="mt-0.5 text-xs text-gray-600">
          Задай новый пароль для аккаунта.
        </div>
      </div>

      <div className="p-4 space-y-3">
        <ErrorBox text={localError} />
        <ErrorBox text={state?.error} />
        {state?.ok ? (
          <SuccessBox text="Пароль обновлён. Сейчас перенаправим..." />
        ) : null}

        <form action={submit} onSubmit={onSubmit} className="space-y-2.5">
          <PasswordInput
            label="Новый пароль"
            name="password"
            value={pass1}
            onChange={setPass1}
          />
          <PasswordInput
            label="Повторите пароль"
            name="password_confirm"
            value={pass2}
            onChange={setPass2}
          />

          <button
            type="submit"
            disabled={pending}
            className="w-full rounded-xl bg-gray-900 px-4 py-2 text-sm font-semibold !text-white hover:bg-black disabled:opacity-60 disabled:!text-white"
          >
            {pending ? "Сохраняем..." : "Сохранить пароль"}
          </button>
        </form>
      </div>
    </div>
  );
}
