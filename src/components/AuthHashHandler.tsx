"use client";

import { useEffect, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";

const AUTH_NEXT_COOKIE = "ordo_auth_next";
const DEFAULT_NEXT = "/app/crm";

function parseHashTokens(hash: string) {
  const params = new URLSearchParams((hash || "").replace(/^#/, ""));
  return {
    accessToken: params.get("access_token") || "",
    refreshToken: params.get("refresh_token") || "",
    type: params.get("type") || "",
  };
}

function readCookie(name: string) {
  const prefix = `${name}=`;
  for (const part of document.cookie.split(";")) {
    const trimmed = part.trim();
    if (trimmed.startsWith(prefix)) {
      return decodeURIComponent(trimmed.slice(prefix.length));
    }
  }
  return "";
}

function clearCookie(name: string) {
  document.cookie = `${name}=; Path=/; Max-Age=0; SameSite=Lax`;
}

function resolveNextPath(raw: string | null | undefined) {
  const candidate = String(raw || "").trim();
  if (!candidate) return DEFAULT_NEXT;
  if (!candidate.startsWith("/") || candidate.startsWith("//")) {
    return DEFAULT_NEXT;
  }
  return candidate;
}

export function AuthHashHandler() {
  const supabase = useMemo(() => createClient(), []);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const pathname = window.location.pathname;
    if (pathname === "/invite" || pathname === "/reset-password") return;

    const { accessToken, refreshToken, type } = parseHashTokens(
      window.location.hash,
    );
    if (!accessToken || !refreshToken) return;
    if (type === "recovery") return;

    let cancelled = false;

    async function hydrateSessionFromHash() {
      const nextFromQuery = new URLSearchParams(window.location.search).get(
        "next",
      );
      const nextFromCookie = readCookie(AUTH_NEXT_COOKIE);
      const nextPath = resolveNextPath(
        nextFromQuery || nextFromCookie || DEFAULT_NEXT,
      );

      const { error } = await supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken,
      });

      if (cancelled) return;

      window.history.replaceState(
        {},
        document.title,
        `${window.location.pathname}${window.location.search}`,
      );
      clearCookie(AUTH_NEXT_COOKIE);

      if (error) {
        window.location.replace("/login?demo_error=1");
        return;
      }

      window.location.replace(nextPath);
    }

    void hydrateSessionFromHash();

    return () => {
      cancelled = true;
    };
  }, [supabase]);

  return null;
}
