"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function LoginClient({ next = "" }: { next?: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function onLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      // твоя логика логина...
      router.push(next || "/");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main style={{ padding: 16 }}>
      <form onSubmit={onLogin}>
        <button disabled={loading} type="submit">
          {loading ? "..." : "Login"}
        </button>
      </form>
    </main>
  );
}
