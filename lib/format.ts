const TZ = "America/Sao_Paulo";

export const formatBrl = (n: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 }).format(n);

/** "Sua próxima análise estará disponível em [dia], [data] às [hora]" (horário de Brasília). */
export function nextAnalysisMessage(iso: string): string {
  const d = new Date(iso);
  const day = new Intl.DateTimeFormat("pt-BR", { weekday: "long", timeZone: TZ }).format(d);
  const date = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", timeZone: TZ }).format(d);
  const time = new Intl.DateTimeFormat("pt-BR", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: TZ }).format(d);
  return `Sua próxima análise estará disponível em ${day}, ${date} às ${time}`;
}
