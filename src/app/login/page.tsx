import React from "react";
import Link from "next/link";
import LoginUI from "./ui";

export default function Page() {
  return (
    <div className="min-h-[100svh] bg-gradient-to-br from-gray-50 via-blue-50/20 to-gray-50">
      {/* mini topbar */}
      <header className="sticky top-0 z-20 border-b border-gray-200/60 bg-white/70 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <div className="font-semibold text-gray-900">Ordero</div>
          <div className="text-sm text-gray-600">
            <Link className="hover:text-gray-900" href="/">
              Home
            </Link>
          </div>
        </div>
      </header>

      {/* page body */}
      <main
        className={[
          "mx-auto max-w-md px-4",
          // высота = viewport - высота топбара (примерно 56px),
          // чтобы карточка реально "влезала" даже с sticky header
          "min-h-[calc(100svh-56px)]",
          // центрируем по вертикали, но даём отступы
          "flex items-center justify-center py-6",
        ].join(" ")}
      >
        <React.Suspense
          fallback={
            <div className="w-full rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
              Loading...
            </div>
          }
        >
          <div className="w-full">
            <LoginUI />
          </div>
        </React.Suspense>
      </main>
    </div>
  );
}
