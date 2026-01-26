"use client";

import React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { loginAction, registerOwnerAction } from "@/app/actions/auth";

const initial = { ok: false, error: "", next: "" };

export default function LoginUI() {
  const router = useRouter();
  const sp = useSearchParams();

  const noBusiness = sp.get("no_business") === "1";

  const [loginState, loginFormAction, loginPending] = React.useActionState(
    loginAction as any,
    initial as any
  );

  const [regState, regFormAction, regPending] = React.useActionState(
    registerOwnerAction as any,
    initial as any
  );

  React.useEffect(() => {
    if (loginState?.ok && loginState?.next) router.push(loginState.next);
  }, [loginState?.ok, loginState?.next, router]);

  React.useEffect(() => {
    if (regState?.ok && regState?.next) router.push(regState.next);
  }, [regState?.ok, regState?.next, router]);

  return (
    <div className="max-w-xl mx-auto space-y-6">
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
        <div className="text-xl font-semibold text-gray-900">Login</div>
        <div className="text-sm text-gray-500 mt-1">Email + password</div>

        {noBusiness && (
          <div className="mt-4 rounded-xl bg-amber-50 text-amber-800 px-4 py-3 text-sm border border-amber-200">
            You are logged in, but no business is linked to your account.
            Register a business below.
          </div>
        )}

        {!!loginState?.error && (
          <div className="mt-4 rounded-xl bg-red-50 text-red-700 px-4 py-3 text-sm">
            {loginState.error}
          </div>
        )}

        <form className="mt-4 space-y-3" action={loginFormAction}>
          <input
            name="email"
            type="email"
            placeholder="Email"
            className="w-full h-11 rounded-xl border border-gray-200 px-3 outline-none"
            required
          />
          <input
            name="password"
            type="password"
            placeholder="Password"
            className="w-full h-11 rounded-xl border border-gray-200 px-3 outline-none"
            required
          />
          <button
            disabled={loginPending}
            className="w-full h-11 rounded-xl bg-gray-900 text-white font-semibold disabled:opacity-60"
          >
            {loginPending ? "Logging in..." : "Login"}
          </button>
        </form>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
        <div className="text-xl font-semibold text-gray-900">
          Register (Owner)
        </div>
        <div className="text-sm text-gray-500 mt-1">
          Создаст business и сделает тебя owner
        </div>

        {!!regState?.error && (
          <div className="mt-4 rounded-xl bg-red-50 text-red-700 px-4 py-3 text-sm">
            {regState.error}
          </div>
        )}

        <form className="mt-4 space-y-3" action={regFormAction}>
          <input
            name="slug"
            placeholder="Business slug (например: test)"
            className="w-full h-11 rounded-xl border border-gray-200 px-3 outline-none"
            required
          />
          <input
            name="owner_phone"
            placeholder="Owner phone (optional)"
            className="w-full h-11 rounded-xl border border-gray-200 px-3 outline-none"
          />
          <input
            name="email"
            type="email"
            placeholder="Email"
            className="w-full h-11 rounded-xl border border-gray-200 px-3 outline-none"
            required
          />
          <input
            name="password"
            type="password"
            placeholder="Password (min 6 chars)"
            className="w-full h-11 rounded-xl border border-gray-200 px-3 outline-none"
            required
          />
          <button
            disabled={regPending}
            className="w-full h-11 rounded-xl bg-blue-600 text-white font-semibold disabled:opacity-60"
          >
            {regPending ? "Registering..." : "Register"}
          </button>

          <div className="text-xs text-gray-500 pt-2">
            Подсказка: для теста можно использовать Gmail alias:{" "}
            <b>shaco063+1@gmail.com</b>, <b>shaco063+2@gmail.com</b> и т.д.
          </div>
        </form>
      </div>
    </div>
  );
}
