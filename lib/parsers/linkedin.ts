import { unzipSync, strFromU8 } from "fflate";
import type { LinkedInProfile } from "@/types/linkedin";
import { readTable } from "./csv";

const MAX_FILE_BYTES = 5 * 1024 * 1024;
const MAX_ITEMS = 200;
const MAX_TEXT = 4000;
export const MAX_RAW_TEXT = 20000;

const MONTHS: Record<string, number> = {
  jan: 0, feb: 1, fev: 1, mar: 2, apr: 3, abr: 3, may: 4, mai: 4, jun: 5,
  jul: 6, aug: 7, ago: 7, sep: 8, set: 8, oct: 9, out: 9, nov: 10, dec: 11, dez: 11,
};

const WANTED = ["profile.csv", "positions.csv", "skills.csv", "education.csv", "certifications.csv"];

/** "Jan 2020", "jan. de 2020" ou "2020" -> índice de mês (ano*12+mês), ou null. */
export function parseMonthIndex(value: string): number | null {
  const year = value.match(/(19|20)\d{2}/);
  if (!year) return null;
  const word = value.toLowerCase().match(/[a-zç]{3}/);
  const month = word && word[0] in MONTHS ? MONTHS[word[0]] : 0;
  return Number(year[0]) * 12 + month;
}

/** Soma os meses cobertos por todos os cargos, sem contar períodos sobrepostos duas vezes. */
export function careerMonths(positions: { startedOn: string; finishedOn: string }[], now = new Date()): number {
  const nowIdx = now.getFullYear() * 12 + now.getMonth();
  const spans = positions
    .map((p) => {
      const start = parseMonthIndex(p.startedOn);
      if (start === null) return null;
      const end = parseMonthIndex(p.finishedOn) ?? nowIdx;
      return end >= start ? ([start, end] as [number, number]) : null;
    })
    .filter((s): s is [number, number] => s !== null)
    .sort((a, b) => a[0] - b[0]);

  let total = 0;
  let curStart = -1;
  let curEnd = -1;
  for (const [s, e] of spans) {
    if (curEnd === -1 || s > curEnd) {
      if (curEnd !== -1) total += curEnd - curStart;
      curStart = s;
      curEnd = e;
    } else if (e > curEnd) {
      curEnd = e;
    }
  }
  if (curEnd !== -1) total += curEnd - curStart;
  return total;
}

/** Lê o .zip exportado do LinkedIn e extrai só os CSVs necessários (ignora mensagens, etc.). */
export function parseLinkedInZip(bytes: Uint8Array, now = new Date()): LinkedInProfile {
  let files: Record<string, Uint8Array>;
  try {
    files = unzipSync(bytes, {
      filter: (f) =>
        WANTED.includes(f.name.split("/").pop()!.toLowerCase()) && f.originalSize <= MAX_FILE_BYTES,
    });
  } catch {
    throw new Error("Não foi possível abrir o arquivo. Envie o .zip original exportado do LinkedIn.");
  }

  const text = (name: string) => {
    const key = Object.keys(files).find((k) => k.split("/").pop()!.toLowerCase() === name);
    return key ? strFromU8(files[key]) : "";
  };

  const profileRow = readTable(text("profile.csv"), "First Name")[0] ?? {};
  const positions = readTable(text("positions.csv"), "Company Name").map((r) => ({
    company: r["Company Name"] ?? "",
    title: r["Title"] ?? "",
    description: r["Description"] ?? "",
    location: r["Location"] ?? "",
    startedOn: r["Started On"] ?? "",
    finishedOn: r["Finished On"] ?? "",
  }));
  const skills = readTable(text("skills.csv"), "Name").map((r) => r["Name"]).filter(Boolean);
  const education = readTable(text("education.csv"), "School Name").map((r) => ({
    school: r["School Name"] ?? "",
    degree: r["Degree Name"] ?? "",
    startedOn: r["Start Date"] ?? "",
    finishedOn: r["End Date"] ?? "",
  }));
  const certifications = readTable(text("certifications.csv"), "Name").map((r) => ({
    name: r["Name"] ?? "",
    authority: r["Authority"] ?? "",
    startedOn: r["Started On"] ?? "",
    finishedOn: r["Finished On"] ?? "",
  }));

  if (!Object.keys(profileRow).length && !positions.length && !skills.length) {
    throw new Error("Nenhum dado de perfil encontrado. Confira se o arquivo é a exportação completa do LinkedIn.");
  }

  const current = positions.find((p) => !p.finishedOn) ?? positions[0];

  return sanitizeLinkedInProfile({
    fullName: [profileRow["First Name"], profileRow["Last Name"]].filter(Boolean).join(" "),
    headline: profileRow["Headline"] ?? "",
    summary: profileRow["Summary"] ?? "",
    location: profileRow["Geo Location"] ?? "",
    currentTitle: current?.title ?? "",
    positions,
    skills,
    education,
    certifications,
    careerMonths: careerMonths(positions, now),
  });
}

const str = (v: unknown, max = 300) => (typeof v === "string" ? v.slice(0, max) : "");
const arr = (v: unknown): unknown[] => (Array.isArray(v) ? v.slice(0, MAX_ITEMS) : []);
const obj = (v: unknown): Record<string, unknown> => (v && typeof v === "object" ? (v as Record<string, unknown>) : {});

/** Valida e limita qualquer entrada (usado no navegador e, de novo, no servidor). */
export function sanitizeLinkedInProfile(input: unknown): LinkedInProfile {
  const p = obj(input);
  const months = Number(p.careerMonths);
  return {
    fullName: str(p.fullName),
    headline: str(p.headline),
    summary: str(p.summary, MAX_TEXT),
    location: str(p.location),
    currentTitle: str(p.currentTitle),
    positions: arr(p.positions).map((x) => {
      const o = obj(x);
      return {
        company: str(o.company), title: str(o.title), description: str(o.description, MAX_TEXT),
        location: str(o.location), startedOn: str(o.startedOn, 40), finishedOn: str(o.finishedOn, 40),
      };
    }),
    skills: arr(p.skills).map((s) => str(s, 100)).filter(Boolean),
    education: arr(p.education).map((x) => {
      const o = obj(x);
      return { school: str(o.school), degree: str(o.degree), startedOn: str(o.startedOn, 40), finishedOn: str(o.finishedOn, 40) };
    }),
    certifications: arr(p.certifications).map((x) => {
      const o = obj(x);
      return { name: str(o.name), authority: str(o.authority), startedOn: str(o.startedOn, 40), finishedOn: str(o.finishedOn, 40) };
    }),
    careerMonths: Number.isFinite(months) ? Math.min(Math.max(Math.round(months), 0), 1200) : 0,
    source: p.source === "pdf" ? "pdf" : "zip",
    rawText: str(p.rawText, MAX_RAW_TEXT),
  };
}
