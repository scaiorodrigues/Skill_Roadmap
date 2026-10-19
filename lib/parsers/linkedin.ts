import { unzipSync } from "fflate";
import type { LinkedInProfile } from "@/types/linkedin";
import { readTable } from "./csv";

const WANTED = ["profile.csv", "positions.csv", "skills.csv", "education.csv", "certifications.csv"];
const MAX_FILE_BYTES = 5 * 1024 * 1024;

const MONTHS: Record<string, number> = {
  jan: 0, feb: 1, fev: 1, mar: 2, apr: 3, abr: 3, may: 4, mai: 4, jun: 5,
  jul: 6, aug: 7, ago: 7, sep: 8, set: 8, oct: 9, out: 9, nov: 10, dec: 11, dez: 11,
};

const LIMITS = { text: 2000, short: 200, positions: 60, skills: 200, education: 30, certifications: 100 };

/** "Jan 2020", "jan de 2020" ou "2020" -> índice de mês (ano*12+mês); null se vazio/inválido. */
export function toMonthIndex(value: string): number | null {
  const year = value.match(/(19|20)\d{2}/);
  if (!year) return null;
  const monthKey = value.trim().slice(0, 3).toLowerCase();
  const month = monthKey in MONTHS ? MONTHS[monthKey] : 0;
  return Number(year[0]) * 12 + month;
}

/** Meses de carreira: união dos períodos das posições, sem contar sobreposições. */
export function careerMonths(periods: { start: string; end: string }[], now = new Date()): number {
  const nowIdx = now.getFullYear() * 12 + now.getMonth();
  const intervals = periods
    .map((p) => ({ s: toMonthIndex(p.start), e: p.end ? toMonthIndex(p.end) : nowIdx }))
    .filter((p): p is { s: number; e: number } => p.s !== null && p.e !== null && p.e >= p.s)
    .sort((a, b) => a.s - b.s);

  let total = 0;
  let curStart = -1;
  let curEnd = -1;
  for (const { s, e } of intervals) {
    if (curEnd < 0 || s > curEnd) {
      if (curEnd >= 0) total += curEnd - curStart;
      curStart = s;
      curEnd = e;
    } else if (e > curEnd) {
      curEnd = e;
    }
  }
  if (curEnd >= 0) total += curEnd - curStart;
  return total;
}

function clean(value: unknown, max: number): string {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

/** Extrai apenas os CSVs necessários do .zip; ignora mensagens, contatos etc. */
export function parseLinkedInZip(bytes: Uint8Array): LinkedInProfile {
  const files = unzipSync(bytes, {
    filter: (f) => {
      const base = f.name.split("/").pop()?.toLowerCase() ?? "";
      return WANTED.includes(base) && f.originalSize <= MAX_FILE_BYTES;
    },
  });

  const text = (name: string): string => {
    const key = Object.keys(files).find((k) => k.split("/").pop()?.toLowerCase() === name);
    return key ? new TextDecoder("utf-8").decode(files[key]) : "";
  };

  if (!Object.keys(files).length) {
    throw new Error("Não encontrei os arquivos do LinkedIn neste .zip. Confira se é o export de dados do LinkedIn.");
  }

  const profileRow = readTable(text("profile.csv"), "First Name")[0] ?? {};
  const positions = readTable(text("positions.csv"), "Company Name").map((r) => ({
    company: r["Company Name"],
    title: r["Title"],
    description: r["Description"],
    location: r["Location"],
    startedOn: r["Started On"],
    finishedOn: r["Finished On"],
  }));
  const skills = readTable(text("skills.csv"), "Name").map((r) => r["Name"]).filter(Boolean);
  const education = readTable(text("education.csv"), "School Name").map((r) => ({
    school: r["School Name"],
    degree: r["Degree Name"],
    startDate: r["Start Date"],
    endDate: r["End Date"],
  }));
  const certifications = readTable(text("certifications.csv"), "Name").map((r) => ({
    name: r["Name"],
    authority: r["Authority"],
    finishedOn: r["Finished On"],
  }));

  return sanitizeLinkedInProfile({
    fullName: [profileRow["First Name"], profileRow["Last Name"]].filter(Boolean).join(" "),
    headline: profileRow["Headline"],
    summary: profileRow["Summary"],
    industry: profileRow["Industry"],
    location: profileRow["Geo Location"],
    positions,
    skills,
    education,
    certifications,
  });
}

/**
 * Valida e normaliza um perfil vindo do cliente (ou do parser): limita tamanhos e
 * quantidades e recalcula os campos derivados. O servidor nunca confia no JSON recebido.
 */
export function sanitizeLinkedInProfile(input: unknown): LinkedInProfile {
  const o = (input && typeof input === "object" ? input : {}) as Record<string, unknown>;
  const list = (v: unknown, max: number): Record<string, unknown>[] =>
    Array.isArray(v) ? v.slice(0, max).filter((x) => x && typeof x === "object") : [];

  const positions = list(o.positions, LIMITS.positions).map((p) => ({
    company: clean(p.company, LIMITS.short),
    title: clean(p.title, LIMITS.short),
    description: clean(p.description, LIMITS.text),
    location: clean(p.location, LIMITS.short),
    startedOn: clean(p.startedOn, 40),
    finishedOn: clean(p.finishedOn, 40),
  }));

  const current = positions.find((p) => !p.finishedOn) ?? positions[0];

  return {
    fullName: clean(o.fullName, LIMITS.short),
    headline: clean(o.headline, LIMITS.text),
    summary: clean(o.summary, LIMITS.text),
    industry: clean(o.industry, LIMITS.short),
    location: clean(o.location, LIMITS.short),
    currentTitle: current?.title ?? "",
    currentCompany: current?.company ?? "",
    careerMonths: careerMonths(positions.map((p) => ({ start: p.startedOn, end: p.finishedOn }))),
    positions,
    skills: (Array.isArray(o.skills) ? o.skills : [])
      .slice(0, LIMITS.skills)
      .map((s) => clean(s, LIMITS.short))
      .filter(Boolean),
    education: list(o.education, LIMITS.education).map((e) => ({
      school: clean(e.school, LIMITS.short),
      degree: clean(e.degree, LIMITS.short),
      startDate: clean(e.startDate, 40),
      endDate: clean(e.endDate, 40),
    })),
    certifications: list(o.certifications, LIMITS.certifications).map((c) => ({
      name: clean(c.name, LIMITS.short),
      authority: clean(c.authority, LIMITS.short),
      finishedOn: clean(c.finishedOn, 40),
    })),
  };
}
