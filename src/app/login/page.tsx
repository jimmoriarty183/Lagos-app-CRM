import React, { Suspense } from "react";
import LoginUI from "./ui";

export const dynamic = "force-dynamic"; // чтобы /login не пытался быть статическим

export default function Page() {
  return (
    <main className="min-h-screen flex items-center justify-center p-6 bg-gradient-to-br from-gray-50 via-blue-50/20 to-gray-50">
      <Suspense
        fallback={<div className="text-sm text-gray-500">Loading…</div>}
      >
        <LoginUI />
      </Suspense>
    </main>
  );
}
