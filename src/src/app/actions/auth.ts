"use server";

import { supabaseServerAction } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export async function registerOwner(formData: FormData) {
  const email = String(formData.get("email") || "").trim();
  const password = String(formData.get("password") || "");
  const slug = String(formData.get("slug") || "").trim();
  const ownerPhone = String(formData.get("owner_phone") || "").trim();

  const supabase = await supabaseServerAction();

  // 1) создать auth юзера
  const { data: signUp, error: signUpErr } = await supabase.auth.signUp({
    email,
    password,
  });
  if (signUpErr) throw signUpErr;

  // 2) залогиниться сразу (чтобы auth.uid() был)
  const { error: signInErr } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  if (signInErr) throw signInErr;

  // 3) создать business + membership owner через RPC
  const { data: businessId, error: rpcErr } = await supabase.rpc(
    "create_business_with_owner",
    {
      p_slug: slug,
      p_owner_phone: ownerPhone || null,
      p_manager_phone: null,
    }
  );
  if (rpcErr) throw rpcErr;

  redirect(`/b/${slug}`);
}
