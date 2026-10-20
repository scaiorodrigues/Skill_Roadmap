export const formatBrl = (n: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 }).format(n);

/** Mensagem quando o limite diário de testes é atingido (o contador zera à meia-noite, horário de Brasília). */
export function limitMessage(kind: "bucket" | "global"): string {
  return kind === "global"
    ? "O app atingiu o limite de análises de hoje. Tente de novo amanhã, a partir das 00:00 (horário de Brasília)."
    : "Você atingiu o limite de testes de hoje. Volte amanhã, a partir das 00:00 (horário de Brasília).";
}
