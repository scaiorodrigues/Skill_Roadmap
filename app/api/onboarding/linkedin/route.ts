import { NextResponse } from "next/server";
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
    return NextResponse.json({ error: "Aceite os termos antes de importar seus dados" }, { status: 403 });
  }

  const raw = await request.text();
  if (raw.length > MAX_BODY_BYTES) return NextResponse.json({ error: "Arquivo muito grande" }, { status: 413 });

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: "Requisição inválida" }, { status: 400 });
  }

  const data = sanitizeLinkedInProfile((parsed as { profile?: unknown })?.profile);
  if (!data.positions.length && !data.skills.length && !data.headline) {
    return NextResponse.json({ error: "Perfil vazio" }, { status: 422 });
  }

  const cipher = await encryptSecret(JSON.stringify(data));
  const { error } = await createAdminClient().from("profiles").update({ linkedin_data: cipher }).eq("id", user.id);
  if (error) return NextResponse.json({ error: "Não foi possível salvar o perfil" }, { status: 500 });

  return NextResponse.json({ ok: true });
}
