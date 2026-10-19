import { NextResponse } from "next/server";
import { createHash } from "crypto";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { encryptSecret } from "@/lib/secrets";
import { sanitizeLinkedInProfile } from "@/lib/parsers/linkedin";

const MAX_BODY_BYTES = 1024 * 1024;

export async function POST(request: Request) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const { data: profile } = await supabase.from("profiles").select("consented_at").eq("id", user.id).single();
  if (!profile?.consented_at) {
    return NextResponse.json({ error: "É preciso aceitar os termos antes de importar" }, { status: 403 });
  }

  const raw = await request.text();
  if (raw.length > MAX_BODY_BYTES) return NextResponse.json({ error: "Arquivo grande demais" }, { status: 413 });

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });
  }

  const data = sanitizeLinkedInProfile((parsed as { profile?: unknown })?.profile);
  if (!data.positions.length && !data.skills.length) {
    return NextResponse.json({ error: "Não encontrei experiências nem skills no arquivo" }, { status: 422 });
  }

  const json = JSON.stringify(data);
  const hash = createHash("sha256").update(json).digest("hex");

  try {
    const cipher = await encryptSecret(json);
    const { error } = await createAdminClient().from("profiles").update({ linkedin_data: cipher }).eq("id", user.id);
    if (error) throw error;
  } catch {
    return NextResponse.json({ error: "Não foi possível salvar o perfil" }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    hash,
    summary: {
      currentTitle: data.currentTitle,
      positions: data.positions.length,
      skills: data.skills.length,
      careerMonths: data.careerMonths,
    },
  });
}
