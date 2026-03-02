"use client";

import { useEffect } from "react";

function buildInviteTarget(pathname: string, search: string, hash: string) {
  const hashParams = new URLSearchParams((hash || "").replace(/^#/, ""));
  const hashType = (hashParams.get("type") || "").toLowerCase();
  const hasInviteTokens = Boolean(hashParams.get("access_token") || hashParams.get("refresh_token"));

  if (hashType !== "invite" && !hasInviteTokens) return null;
  if (pathname.startsWith("/invite")) return null;

  const qs = new URLSearchParams(search || "");
  const inviteId = qs.get("invite_id");

  const inviteUrl = new URL(window.location.origin + "/invite");
  if (inviteId) inviteUrl.searchParams.set("invite_id", inviteId);

  // Важно: переносим hash-токены на /invite, чтобы InviteClient мог setSession().
  inviteUrl.hash = hash.startsWith("#") ? hash.slice(1) : hash;
  return inviteUrl.toString();
}

export default function InviteHashRedirect() {
  useEffect(() => {
    if (typeof window === "undefined") return;

    const { pathname, search, hash } = window.location;
    const target = buildInviteTarget(pathname, search, hash);
    if (!target) return;

    window.location.replace(target);
  }, []);

  return null;
}
