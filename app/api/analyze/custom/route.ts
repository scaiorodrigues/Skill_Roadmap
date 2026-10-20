import { NextResponse } from "next/server";
import { GeminiError, generateJson } from "@/lib/gemini/client";
import { CUSTOM_SCHEMA, SYSTEM_PROMPT, buildCustomPrompt, normalizeOption } from "@/lib/gemini/career-options";
import { sanitizeLinkedInProfile } from "@/lib/parsers/linkedin";
import { readJsonBody } from "@/lib/request";
import { LIMITS, claimUsage, releaseUsage, visitorBucket } from "@/lib/usage";
import { limitMessage } from "@/lib/format";

export const maxDuration = 26;

/** 6ª opção: um caminho de interesse pessoal do usuário. Também sem guardar nada no servidor. */
export async function POST(request: Request) {
  const parsed = await readJsonBody(request);
  if ("error" in parsed) return parsed.error;

  const interest = typeof parsed.body.interest === "string" ? parsed.body.interest.trim().slice(0, 300) : "";
  if (interest.length < 3) return NextResponse.json({ error: "Descreva o caminho que você tem em mente" }, { status: 400 });
  const profile = sanitizeLinkedInProfile(parsed.body.profile);

  const bucket = visitorBucket(request, "custom");
  let claim;
  try {
    claim = await claimUsage(bucket, LIMITS.customPerIp());
  } catch {
    console.error("usage check failed");
    return NextResponse.json({ error: "Serviço indisponível no momento. Tente novamente em instantes." }, { status: 503 });
  }
  if (claim !== "ok") return NextResponse.json({ error: limitMessage(claim) }, { status: 429 });

  try {
    const raw = await generateJson({ system: SYSTEM_PROMPT, prompt: buildCustomPrompt(profile, interest), schema: CUSTOM_SCHEMA, maxOutputTokens: 2000 });
    const custom = normalizeOption(raw, 99);
    if (!custom) throw new Error("Resposta inválida");
    return NextResponse.json({ custom });
  } catch (e) {
    await releaseUsage(bucket);
    console.error("custom path failed", { status: e instanceof GeminiError ? e.status : 0 });
    return NextResponse.json({ error: "Não foi possível gerar esse caminho agora. Tente novamente." }, { status: 502 });
  }
}
