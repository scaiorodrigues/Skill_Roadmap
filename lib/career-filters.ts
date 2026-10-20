import type { CareerOption, MoneyRange, Stress } from "@/types/career";

export type WorkMode = "todas" | "presencial" | "remoto";
export type SortBy = "salario" | "stress";

export interface Filters {
  tags: string[];
  /** Lugar escolhido (como aparece na lista), ou "" para todos. Ignorado em home office. */
  place: string;
  mode: WorkMode;
  sort: SortBy;
}

/** O que o cartão destaca: qual salário mostrar e de onde ele vem. */
export interface CardView {
  option: CareerOption;
  headline: { label: string; salary: MoneyRange };
}

const STRESS_ORDER: Record<Stress, number> = { baixo: 0, médio: 1, alto: 2 };
export const placeKey = (s: string) =>
  s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, " ").trim();

/** Todos os lugares citados nos caminhos, sem repetição, em ordem alfabética. */
export function listPlaces(options: CareerOption[]): string[] {
  const byKey = new Map<string, string>();
  for (const o of options) for (const l of o.locations ?? []) if (!byKey.has(placeKey(l.place))) byKey.set(placeKey(l.place), l.place);
  return [...byKey.values()].sort((a, b) => a.localeCompare(b, "pt-BR"));
}

const topLabel = (o: CareerOption) => (o.topRole ? `Topo: ${o.topRole.title}` : "Faixa salarial");

/**
 * Aplica tags, modalidade e lugar, e escolhe o salário de destaque de cada cartão.
 * Tudo roda no navegador: filtrar e reordenar não chama a IA.
 */
export function applyFilters(options: CareerOption[], f: Filters): CardView[] {
  const views: CardView[] = [];
  for (const o of options) {
    if (!f.tags.every((t) => o.tags.includes(t))) continue;

    if (f.mode === "remoto") {
      // Só caminhos em que home office é comum ou possível (pesquisas antigas não têm essa informação).
      if (!o.remote || o.remote.availability === "raro") continue;
      views.push({ option: o, headline: { label: `${topLabel(o)} · home office`, salary: o.remote.salaryBrl } });
      continue;
    }

    if (f.place) {
      const loc = o.locations?.find((l) => placeKey(l.place) === placeKey(f.place));
      if (!loc) continue;
      views.push({ option: o, headline: { label: `${topLabel(o)} · ${loc.place}`, salary: loc.salaryBrl } });
      continue;
    }

    if (f.mode === "presencial" && !(o.locations && o.locations.length)) continue;
    views.push({ option: o, headline: { label: topLabel(o), salary: o.salaryBrl } });
  }

  return views.sort((a, b) =>
    f.sort === "stress"
      ? STRESS_ORDER[a.option.stress] - STRESS_ORDER[b.option.stress] || b.headline.salary.max - a.headline.salary.max
      : b.headline.salary.max - a.headline.salary.max || b.headline.salary.min - a.headline.salary.min,
  );
}

/** Maior valor entre etapas, lugares e home office: a escala comum das barras de todos os cartões. */
export function salaryScale(options: CareerOption[]): number {
  let max = 0;
  for (const o of options) {
    max = Math.max(max, o.salaryBrl.max, o.remote?.salaryBrl.max ?? 0);
    for (const s of o.steps ?? []) max = Math.max(max, s.salaryBrl.max);
    for (const l of o.locations ?? []) max = Math.max(max, l.salaryBrl.max);
  }
  return max || 1;
}
