"use client";

import { useRouter } from "next/navigation";

export default function WelcomeClient({ u = "" }: { u?: string }) {
  const router = useRouter();

  return (
    <main style={{ padding: 16 }}>
      <h1>Welcome</h1>
      <div style={{ opacity: 0.7 }}>u: {u || "(empty)"}</div>

      <button
        onClick={() => router.push(u ? `/b/${u}` : "/")}
        style={{
          height: 44,
          padding: "0 14px",
          borderRadius: 12,
          border: "1px solid #111827",
          background: "#111827",
          color: "white",
          cursor: "pointer",
          marginTop: 12,
        }}
      >
        Continue
      </button>
    </main>
  );
}
