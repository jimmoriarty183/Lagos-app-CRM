"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function InvitePage() {
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [hasSession, setHasSession] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getSession();
      setHasSession(!!data.session);
      setLoading(false);
    })();
  }, [supabase]);

  if (loading) return <div className="p-6 text-sm text-gray-600">Loading…</div>;

  // ✅ если нет token и нет session — значит человек открыл /invite не из письма
  if (!hasSession) {
    return (
      <div className="p-6 text-sm text-red-600">
        Invite is not active. Please open the link from email again.
      </div>
    );
  }

  // ✅ если session есть — показываем форму (имя/телефон) и дальше ты делаешь accept
  return (
    <div className="p-6">
      {/* ТВОЯ ФОРМА name/phone/password или name/phone */}
      <div className="text-sm text-gray-700">
        Session OK. Show manager form here.
      </div>
    </div>
  );
}
