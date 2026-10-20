import { NextResponse } from "next/server";
import { checkGemini } from "@/lib/gemini/client";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

/**
 * Diagnóstico de configuração, para quem administra o app. Não mostra nenhuma chave
 * e não gera análise (não gasta cota): só pergunta ao Google se a chave e o modelo são aceitos
 * e confirma que o contador de uso existe no banco.
 */
export async function GET() {
  const gemini = await checkGemini();
  let usageCounter: "ok" | "error" = "ok";
  try {
    const { error } = await createAdminClient().rpc("release_usage", { p_bucket: "health-check" });
    if (error) usageCounter = "error";
  } catch {
    usageCounter = "error";
  }
  const ok = gemini.status === "ok" && usageCounter === "ok";
  return NextResponse.json({ ok, gemini, usageCounter }, { status: ok ? 200 : 503, headers: { "Cache-Control": "no-store" } });
}
