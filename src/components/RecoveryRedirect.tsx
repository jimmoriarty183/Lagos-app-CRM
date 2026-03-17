"use client";

import { useEffect } from "react";

function hasRecoveryTokens(hash: string) {
  const params = new URLSearchParams((hash || "").replace(/^#/, ""));
  return (
    params.get("type") === "recovery" &&
    Boolean(params.get("access_token")) &&
    Boolean(params.get("refresh_token"))
  );
}

export function RecoveryRedirect() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.location.pathname === "/reset-password") return;
    if (!hasRecoveryTokens(window.location.hash)) return;

    window.location.replace(`/reset-password${window.location.hash}`);
  }, []);

  return null;
}
