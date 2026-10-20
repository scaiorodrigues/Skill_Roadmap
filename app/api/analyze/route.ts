import { NextResponse } from "next/server";
import { GeminiError, generateJson } from "@/lib/gemini/client";
import { DISCLAIMER, OPTIONS_SCHEMA, SYSTEM_PROMPT, buildOptionsPrompt, normalizeOptions } from "@/lib/gemini/career-options";
import { sanitizeLinkedInProfile } from "@/lib/parsers/linkedin";
import { readJsonBody } from "@/lib/request";
import { LIMITS, claimUsage, releaseUsage, visitorBucket } from "@/lib/usage";
import { limitMessage } from "@/lib/format";
import type { RoadmapOptions, ProfileSummary } from "@/types/career";

export const maxDuration = 26;

export interface AnalyzeResponse {
  summary: ProfileSummary;
  result: RoadmapOptions;
}

/**
 * Intermediário sem memória: recebe o perfil, pede os 5 caminhos ao Gemini e devolve.
 * Nada do perfil é gravado no servidor; o histórico fica no aparelho do usuário.
 */
export async function POST(request: Request) {
  const parsed = await readJsonBody(request);
  if ("error" in parsed) return parsed.error;

  const profile = sanitizeLinkedInProfile(parsed.body.profile);
  const hasContent = profile.positions.length > 0 || profile.skills.length > 0 || Boolean(profile.headline) || (profile.rawText?.length ?? 0) >= 200;
  if (!hasContent) return NextResponse.json({ error: "Perfil vazio" }, { status: 422 });

  const bucket = visitorBucket(request, "analysis");
  let claim;
  try {
    claim = await claimUsage(bucket, LIMITS.analysisPerIp());
  } catch {
    console.error("usage check failed");
    return NextResponse.json({ error: "Serviço indisponível no momento. Tente novamente em instantes." }, { status: 503 });
  }
  if (claim !== "ok") return NextResponse.json({ error: limitMessage(claim) }, { status: 429 });

  try {
    const { data: raw, model } = await generateJson({ system: SYSTEM_PROMPT, prompt: buildOptionsPrompt(profile), schema: OPTIONS_SCHEMA, maxOutputTokens: 7000 });
    const { summary, options } = normalizeOptions(raw);
    const result: RoadmapOptions = { options, custom: null, disclaimer: DISCLAIMER, model };
    return NextResponse.json({ summary, result } satisfies AnalyzeResponse);
  } catch (e) {
    await releaseUsage(bucket); // falhou: o teste do dia não é consumido
    console.error("analyze failed", { status: e instanceof GeminiError ? e.status : 0, reason: e instanceof GeminiError ? e.reason : "" });
    const error =
      e instanceof GeminiError && e.isConfigError
        ? "O serviço de IA do app está com um problema de configuração. Esse teste não foi descontado. Avise o responsável pelo app."
        : "Não foi possível gerar sua análise agora. Esse teste não foi descontado; tente novamente em instantes.";
    // Código e mensagem do Google ajudam a corrigir a configuração; nunca contêm a chave.
    const technical = e instanceof GeminiError ? { code: e.reason || String(e.status), detail: e.detail } : undefined;
    return NextResponse.json({ error, technical }, { status: 502 });
  }
}
