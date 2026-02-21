import React from "react";
import Link from "next/link";
import LoginUI from "./ui";

export default function Page() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/20 to-gray-50">
      {/* mini topbar */}
      <header className="sticky top-0 z-20 border-b border-gray-200/60 bg-white/70 backdrop-blur">
        <div className="mx-auto max-w-5xl px-4 py-3 flex items-center justify-between">
          <div className="font-semibold text-gray-900">Ordero</div>
          <div className="text-sm text-gray-600">
            <Link className="hover:text-gray-900" href="/">
              Home
            </Link>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-md px-4 py-10">
        <React.Suspense
          fallback={
            <div className="rounded-2xl border border-gray-200 bg-white shadow-sm p-6">
              Loading...
            </div>
          }
        >
          <LoginUI />
        </React.Suspense>
      </div>
    </div>
  );
}
