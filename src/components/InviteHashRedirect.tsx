"use client";

import { useEffect } from "react";

export default function InviteHashRedirect() {
  useEffect(() => {
    if (typeof window === "undefined") return;

    const hash = window.location.hash || "";
    if (!hash.includes("type=invite")) return;

    const target = `/invite${hash}`;
    window.location.replace(target);
  }, []);

  return null;
}
