import type { Backup, ComparisonRecord, Research } from "@/types/research";
import type { CareerOption, Demand, LocationInfo, MoneyRange, PathStep, ProfileSummary, RemoteAvailability, RoadmapOptions, Stress } from "@/types/career";
import { sanitizeLinkedInProfile } from "@/lib/parsers/linkedin";
import { normalizeProfileSummary } from "@/lib/gemini/career-options";

const MAX_ITEMS = 500;

const obj = (v: unknown): Record<string, unknown> => (v && typeof v === "object" ? (v as Record<string, unknown>) : {});
const text = (v: unknown, max: number) => (typeof v === "string" ? v.slice(0, max) : "");
const list = (v: unknown, n: number, max: number) => (Array.isArray(v) ? v : []).map((x) => text(x, max)).filter(Boolean).slice(0, n);
const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? Math.max(0, Math.round(v)) : 0);
const validDate = (v: unknown) => typeof v === "string" && !Number.isNaN(Date.parse(v));

/** Valida um cartão de carreira já no formato guardado. */
export function sanitizeStoredOption(raw: unknown): CareerOption | null {
  const r = obj(raw);
  const title = text(r.title, 100);
  if (!title) return null;
  const sal = obj(r.salaryBrl);
  const stress: Stress = r.stress === "baixo" || r.stress === "alto" ? r.stress : "médio";
  const money = (v: unknown): MoneyRange => {
    const m = obj(v);
    return { min: num(m.min), max: num(m.max) };
  };
  const steps: PathStep[] = (Array.isArray(r.steps) ? r.steps : [])
    .slice(0, 5)
    .map((x) => ({ title: text(obj(x).title, 80), years: text(obj(x).years, 20), salaryBrl: money(obj(x).salaryBrl) }))
    .filter((x) => x.title);
  const top = obj(r.topRole);
  const rem = obj(r.remote);
  const availability: RemoteAvailability = rem.availability === "comum" || rem.availability === "raro" ? rem.availability : "possível";
  const locations: LocationInfo[] = (Array.isArray(r.locations) ? r.locations : [])
    .slice(0, 4)
    .map((x) => {
      const o = obj(x);
      const demand: Demand = o.demand === "alta" || o.demand === "baixa" ? o.demand : "média";
      return { place: text(o.place, 60), demand, salaryBrl: money(o.salaryBrl) };
    })
    .filter((x) => x.place);
  // Pesquisas antigas não têm etapas, topo, home office nem lugares: os campos ficam ausentes.
  const extra = {
    ...(steps.length ? { steps } : {}),
    ...(text(top.title, 80) ? { topRole: { title: text(top.title, 80), salaryBrl: money(top.salaryBrl) } } : {}),
    ...(r.remote ? { remote: { availability, salaryBrl: money(rem.salaryBrl) } } : {}),
    ...(locations.length ? { locations } : {}),
  };
  return {
    ...extra,
    id: text(r.id, 120) || title,
    title,
    summary: text(r.summary, 400),
    whyFit: text(r.whyFit, 400),
    salaryBrl: { min: num(sal.min), max: num(sal.max) },
    salaryRemote: text(r.salaryRemote, 120),
    salaryAbroad: text(r.salaryAbroad, 120),
    geography: text(r.geography, 200),
    stress,
    stressNote: text(r.stressNote, 200),
    benefits: list(r.benefits, 6, 100),
    complaints: list(r.complaints, 6, 100),
    tags: list(r.tags, 6, 30),
  };
}

export function sanitizeResult(raw: unknown): RoadmapOptions | null {
  const r = obj(raw);
  const options = (Array.isArray(r.options) ? r.options : []).slice(0, 5).map(sanitizeStoredOption).filter((o): o is CareerOption => o !== null);
  if (options.length === 0) return null;
  return {
    options,
    custom: r.custom ? sanitizeStoredOption(r.custom) : null,
    disclaimer: text(r.disclaimer, 400),
    model: text(r.model, 60),
  };
}

export function sanitizeResearch(raw: unknown): Research | null {
  const r = obj(raw);
  const id = text(r.id, 100);
  const result = sanitizeResult(r.result);
  if (!id || !validDate(r.createdAt) || !result) return null;
  const summary: ProfileSummary = normalizeProfileSummary(r.summary);
  return {
    id,
    createdAt: r.createdAt as string,
    title: text(r.title, 160) || "Pesquisa",
    profile: sanitizeLinkedInProfile(r.profile),
    summary,
    result,
  };
}

export function sanitizeComparison(raw: unknown): ComparisonRecord | null {
  const r = obj(raw);
  const id = text(r.id, 100);
  const aId = text(r.aId, 100);
  const bId = text(r.bId, 100);
  if (!id || !aId || !bId || !validDate(r.createdAt)) return null;
  return { id, createdAt: r.createdAt as string, aId, bId };
}

/** Valida um arquivo de backup. Descarta itens inválidos em vez de quebrar. */
export function parseBackup(raw: unknown): Backup {
  const r = obj(raw);
  if (r.version !== 1) throw new Error("Este arquivo não é um backup do Skill RoadMap.");
  const researches = (Array.isArray(r.researches) ? r.researches : []).slice(0, MAX_ITEMS).map(sanitizeResearch).filter((x): x is Research => x !== null);
  const ids = new Set(researches.map((x) => x.id));
  const comparisons = (Array.isArray(r.comparisons) ? r.comparisons : [])
    .slice(0, MAX_ITEMS)
    .map(sanitizeComparison)
    .filter((c): c is ComparisonRecord => c !== null && ids.has(c.aId) && ids.has(c.bId));
  return { version: 1, exportedAt: validDate(r.exportedAt) ? (r.exportedAt as string) : new Date().toISOString(), researches, comparisons };
}
