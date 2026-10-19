import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { decryptSecret } from "@/lib/secrets";
import { claimAnalysis, releaseAnalysis } from "@/lib/rate-limit";
import { GEMINI_MODEL, GeminiError, generateJson } from "@/lib/gemini/client";
import { DISCLAIMER, OPTIONS_SCHEMA, SYSTEM_PROMPT, buildOptionsPrompt, normalizeOptions } from "@/lib/gemini/career-options";
import { sanitizeLinkedInProfile } from "@/lib/parsers/linkedin";
import { nextAnalysisMessage } from "@/lib/format";
import type { RoadmapOptions } from "@/types/career";

export const maxDuration = 26;

/** Gera os 5 caminhos de carreira. Consome a análise do ciclo (1 a cada 30 dias). */
export async function POST() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const admin = createAdminClient();
  const { data: profile } = await admin
    .from("profiles")
    .select("consented_at, linkedin_data")
    .eq("id", user.id)
    .single();
  if (!profile?.consented_at) return NextResponse.json({ error: "Aceite os termos antes de continuar" }, { status: 403 });
  if (!profile.linkedin_data) return NextResponse.json({ error: "Importe seu perfil do LinkedIn primeiro" }, { status: 409 });

  const claim = await claimAnalysis(user.id);
  if (!claim.ok) {
    return NextResponse.json(
      { error: nextAnalysisMessage(claim.nextAvailable), nextAvailable: claim.nextAvailable },
      { status: 429 },
    );
  }

  try {
    const linkedin = sanitizeLinkedInProfile(JSON.parse(await decryptSecret(profile.linkedin_data as string)));
    const raw = await generateJson({
      system: SYSTEM_PROMPT,
      prompt: buildOptionsPrompt(linkedin),
      schema: OPTIONS_SCHEMA,
    });
    const { summary, options } = normalizeOptions(raw);

    const roadmapOptions: RoadmapOptions = { options, custom: null, disclaimer: DISCLAIMER, model: GEMINI_MODEL };
    const { error } = await admin.from("analyses").insert({
      user_id: user.id,
      linkedin_hash: createHash("sha256").update(JSON.stringify(linkedin)).digest("hex"),
      raw_profile: summary,
      roadmap_options: roadmapOptions,
    });
    if (error) throw new Error("Falha ao salvar a análise");

    return NextResponse.json({ ok: true });
  } catch (e) {
    await releaseAnalysis(user.id); // o usuário não perde a análise do mês
    const status = e instanceof GeminiError ? e.status : 0;
    console.error("analyze failed", { status, message: e instanceof Error ? e.message : "unknown" });
    return NextResponse.json(
      { error: "Não foi possível gerar sua análise agora. Você não perdeu a análise do mês; tente novamente em instantes." },
      { status: 502 },
    );
  }
}
