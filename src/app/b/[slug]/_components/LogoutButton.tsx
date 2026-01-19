"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function LogoutButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const onLogout = async () => {
    if (loading) return;
    setLoading(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch {
      // игнор, всё равно редиректим
    } finally {
      // чтобы middleware точно не пустил обратно — перезагружаем
      router.replace("/login");
      router.refresh();
      setLoading(false);
    }
  };

  return (
    <button
      onClick={onLogout}
      disabled={loading}
      style={{
        height: 38,
        padding: "0 12px",
        borderRadius: 12,
        border: "1px solid #e5e7eb",
        background: "white",
        fontWeight: 900,
        cursor: loading ? "default" : "pointer",
        opacity: loading ? 0.7 : 1,
      }}
      title="Log out"
    >
      {loading ? "Logging out..." : "Logout"}
    </button>
  );
}
