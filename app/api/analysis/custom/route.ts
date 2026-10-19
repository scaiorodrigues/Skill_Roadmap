import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { decryptSecret } from "@/lib/secrets";
import { GeminiError, generateJson } from "@/lib/gemini/client";
import { CUSTOM_SCHEMA, SYSTEM_PROMPT, buildCustomPrompt, normalizeOption } from "@/lib/gemini/career-options";
import { sanitizeLinkedInProfile } from "@/lib/parsers/linkedin";
import type { RoadmapOptions } from "@/types/career";

export const maxDuration = 26;

/** 6ª opção: caminho de interesse pessoal. Uma por análise; não consome nova análise do mês. */
export async function POST(request: Request) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const body = (await request.json().catch(() => ({}))) as { interest?: unknown };
  const interest = typeof body.interest === "string" ? body.interest.trim().slice(0, 300) : "";
  if (interest.length < 3) return NextResponse.json({ error: "Descreva o caminho que você tem em mente" }, { status: 400 });

  const admin = createAdminClient();
  const { data: analysis } = await supabase
    .from("analyses")
    .select("id, roadmap_options")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!analysis) return NextResponse.json({ error: "Gere sua análise primeiro" }, { status: 409 });

  const current = analysis.roadmap_options as RoadmapOptions;
  if (current.custom) return NextResponse.json({ error: "Você já usou o seu caminho personalizado nesta análise" }, { status: 409 });

  const { data: profile } = await admin.from("profiles").select("linkedin_data").eq("id", user.id).single();
  if (!profile?.linkedin_data) return NextResponse.json({ error: "Importe seu perfil do LinkedIn primeiro" }, { status: 409 });

  try {
    const linkedin = sanitizeLinkedInProfile(JSON.parse(await decryptSecret(profile.linkedin_data as string)));
    const raw = await generateJson({ system: SYSTEM_PROMPT, prompt: buildCustomPrompt(linkedin, interest), schema: CUSTOM_SCHEMA, maxOutputTokens: 2000 });
    const custom = normalizeOption(raw, 99);
    if (!custom) throw new Error("Resposta inválida");

    // Só grava se ninguém tiver gravado o caminho personalizado nesse meio-tempo.
    const { data: updated, error } = await admin
      .from("analyses")
      .update({ roadmap_options: { ...current, custom } })
      .eq("id", analysis.id)
      .eq("user_id", user.id)
      .filter("roadmap_options->>custom", "is", null)
      .select("id");
    if (error || !updated?.length) throw new Error("Falha ao salvar");

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("custom path failed", { status: e instanceof GeminiError ? e.status : 0 });
    return NextResponse.json({ error: "Não foi possível gerar esse caminho agora. Tente novamente." }, { status: 502 });
  }
}
