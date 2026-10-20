export const formatBrl = (n: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 }).format(n);

/** Mensagem quando o limite diário de testes é atingido (o contador zera à meia-noite, horário de Brasília). */
export function limitMessage(kind: "bucket" | "global"): string {
  return kind === "global"
    ? "O app atingiu o limite de análises de hoje. Tente de novo amanhã, a partir das 00:00 (horário de Brasília)."
    : "Você atingiu o limite de testes de hoje. Volte amanhã, a partir das 00:00 (horário de Brasília).";
}

/** Mensagem de erro da API + código técnico (quando houver), para facilitar o diagnóstico. */
export function withTechnical(body: { error?: unknown; technical?: { code?: unknown; detail?: unknown } }, fallback: string): string {
  const msg = typeof body.error === "string" ? body.error : fallback;
  const code = typeof body.technical?.code === "string" ? body.technical.code : "";
  const detail = typeof body.technical?.detail === "string" ? body.technical.detail : "";
  return code ? `${msg} (código: ${code}${detail ? ` — ${detail}` : ""})` : msg;
}
