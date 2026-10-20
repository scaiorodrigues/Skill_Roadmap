import { NextResponse } from "next/server";

const MAX_BODY_CHARS = 150_000;

/** Aceita só chamadas vindas do próprio site (barra o uso casual a partir de outros sites). */
export function isSameOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  const host = request.headers.get("host");
  if (!origin || !host) return false;
  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}

/** Lê o corpo JSON com limite de tamanho. Devolve uma resposta de erro pronta quando algo está errado. */
export async function readJsonBody(request: Request): Promise<{ body: Record<string, unknown> } | { error: NextResponse }> {
  if (!isSameOrigin(request)) return { error: NextResponse.json({ error: "Origem não permitida" }, { status: 403 }) };
  const text = await request.text();
  if (text.length > MAX_BODY_CHARS) return { error: NextResponse.json({ error: "Arquivo muito grande" }, { status: 413 }) };
  try {
    const body = JSON.parse(text);
    if (!body || typeof body !== "object") throw new Error();
    return { body };
  } catch {
    return { error: NextResponse.json({ error: "Requisição inválida" }, { status: 400 }) };
  }
}
