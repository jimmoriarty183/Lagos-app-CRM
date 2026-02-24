import { Suspense } from "react";
import InviteClient from "./InviteClient";

export default function InvitePage() {
  return (
    <Suspense fallback={<InviteSkeleton />}>
      <InviteClient />
    </Suspense>
  );
}

function InviteSkeleton() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/20 to-gray-50">
      <div className="mx-auto max-w-2xl px-4 py-10">
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm sm:p-8">
          <div className="h-7 w-64 rounded bg-gray-100" />
          <div className="mt-3 h-4 w-80 rounded bg-gray-100" />

          <div className="mt-6 space-y-3">
            <div className="h-12 w-full rounded-xl bg-gray-100" />
            <div className="h-12 w-full rounded-xl bg-gray-100" />
            <div className="h-12 w-full rounded-xl bg-gray-100" />
            <div className="h-12 w-full rounded-xl bg-gray-100" />
            <div className="h-12 w-full rounded-xl bg-gray-100" />
          </div>
        </div>
      </div>
    </main>
  );
}
