import { NextResponse } from "next/server";
import { checkGemini, type GeminiHealth } from "@/lib/gemini/client";
import { claimUsage, visitorBucket } from "@/lib/usage";

export const dynamic = "force-dynamic";

const HEALTH_PER_IP = 10;

/**
 * Diagnóstico de configuração, para quem administra o app. Não mostra nenhuma chave.
 * Testa a IA com uma geração mínima, limitada a 10 por visitante por dia. Se o contador de uso
 * (banco) não responder, a IA não é chamada: nunca há chamada à IA sem controle de custo.
 */
export async function GET(request: Request) {
  let usageCounter: "ok" | "error" = "ok";
  let gemini: GeminiHealth | string;
  try {
    const claim = await claimUsage(visitorBucket(request, "health"), HEALTH_PER_IP);
    gemini = claim === "ok" ? await checkGemini() : "não testado: limite diário de diagnósticos atingido";
  } catch {
    usageCounter = "error";
    gemini = "não testado: contador de uso indisponível";
  }
  const ok = typeof gemini === "object" && gemini.status === "ok" && usageCounter === "ok";
  return NextResponse.json({ ok, gemini, usageCounter }, { status: ok ? 200 : 503, headers: { "Cache-Control": "no-store" } });
}
