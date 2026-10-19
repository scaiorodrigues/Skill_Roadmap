import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const CONSENT_VERSION = "2026-10-v1";

export async function POST() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const { error } = await supabase
    .from("profiles")
    .update({ consented_at: new Date().toISOString(), consent_version: CONSENT_VERSION })
    .eq("id", user.id);
  if (error) return NextResponse.json({ error: "Não foi possível registrar o consentimento" }, { status: 500 });
  return NextResponse.json({ ok: true });
}
