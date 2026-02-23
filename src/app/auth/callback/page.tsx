"use client";

import { useEffect } from "react";
import { createBrowserClient } from "@supabase/ssr";

export default function AuthCallbackPage() {
  useEffect(() => {
    const run = async () => {
      const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      );

      const url = new URL(window.location.href);
      const inviteId = url.searchParams.get("invite_id") || "";

      // HASH flow: #access_token=...&refresh_token=...
      const hash = window.location.hash;
      if (hash && hash.includes("access_token=")) {
        const params = new URLSearchParams(hash.replace("#", ""));
        const access_token = params.get("access_token");
        const refresh_token = params.get("refresh_token");

        if (access_token && refresh_token) {
          const { error } = await supabase.auth.setSession({
            access_token,
            refresh_token,
          });

          if (!error) {
            window.location.replace(
              `/invite?invite_id=${encodeURIComponent(inviteId)}`,
            );
            return;
          }
        }
      }

      // PKCE fallback (если когда-то включишь)
      const code = url.searchParams.get("code");
      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (!error) {
          window.location.replace(
            `/invite?invite_id=${encodeURIComponent(inviteId)}`,
          );
          return;
        }
      }

      window.location.replace("/login?callback_failed=1");
    };

    run();
  }, []);

  return null;
}
