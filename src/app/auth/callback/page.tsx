"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function AuthCallbackPage() {
  const router = useRouter();

  useEffect(() => {
    const supabase = createClient();

    (async () => {
      // Supabase сам подхватит access_token из URL hash и сохранит сессию
      const { data } = await supabase.auth.getSession();

      // если сессия есть — ведём на форму приглашения
      if (data.session) {
        router.replace("/invite");
        return;
      }

      // если нет — на логин (или на invite тоже можно)
      router.replace("/login");
    })();
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center text-sm text-gray-600">
      Signing you in…
    </div>
  );
}
