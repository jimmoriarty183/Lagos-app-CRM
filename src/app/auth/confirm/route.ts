import { NextResponse, type NextRequest } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";

const DEFAULT_NEXT = "/app/crm";

function resolveNextPath(raw: string | null): string {
  if (!raw) return DEFAULT_NEXT;
  const candidate = raw.trim();
  if (!candidate.startsWith("/") || candidate.startsWith("//")) {
    return DEFAULT_NEXT;
  }
  return candidate;
}

function resolveRecoveryType(raw: string | null): "recovery" | null {
  return raw === "recovery" ? "recovery" : null;
}

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const tokenHash = url.searchParams.get("token_hash");
  const type = resolveRecoveryType(url.searchParams.get("type"));
  const nextPath = resolveNextPath(url.searchParams.get("next") || "/reset-password");

  if (!tokenHash || !type) {
    return NextResponse.redirect(new URL("/reset-password?error=recovery_link_invalid", url.origin));
  }

  const supabase = await supabaseServer();
  const { error } = await supabase.auth.verifyOtp({
    type,
    token_hash: tokenHash,
  });

  if (error) {
    return NextResponse.redirect(new URL("/reset-password?error=recovery_link_invalid", url.origin));
  }

  return NextResponse.redirect(new URL(nextPath, url.origin));
}
