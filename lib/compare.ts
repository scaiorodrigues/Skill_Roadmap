import type { Research } from "@/types/research";
import type { CareerOption, Stress } from "@/types/career";

export interface OptionChange {
  title: string;
  salaryMaxDelta: number;
  salaryMinDelta: number;
  stressFrom: Stress;
  stressTo: Stress;
}

export interface Comparison {
  older: Research;
  newer: Research;
  profile: {
    role: { from: string; to: string } | null;
    seniority: { from: string; to: string } | null;
    careerYearsDelta: number;
    skillsAdded: string[];
    skillsRemoved: string[];
    certificationsAdded: string[];
    certificationsRemoved: string[];
  };
  options: {
    top: { from: string; to: string } | null;
    added: CareerOption[];
    removed: CareerOption[];
    changed: OptionChange[];
  };
}

const key = (s: string) =>
  s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, " ").trim();

function diff(before: string[], after: string[]) {
  const b = new Map(before.map((x) => [key(x), x]));
  const a = new Map(after.map((x) => [key(x), x]));
  return {
    added: [...a].filter(([k]) => !b.has(k)).map(([, v]) => v),
    removed: [...b].filter(([k]) => !a.has(k)).map(([, v]) => v),
  };
}

const skillsOf = (r: Research) => [...r.summary.topSkills, ...r.profile.skills];
const certsOf = (r: Research) => r.profile.certifications.map((c) => c.name);
const allOptions = (r: Research) => (r.result.custom ? [...r.result.options, r.result.custom] : r.result.options);

/** Compara duas pesquisas. A mais antiga é sempre a base, qualquer que seja a ordem recebida. */
export function compareResearches(x: Research, y: Research): Comparison {
  const [older, newer] = x.createdAt <= y.createdAt ? [x, y] : [y, x];

  const skills = diff(skillsOf(older), skillsOf(newer));
  const certs = diff(certsOf(older), certsOf(newer));

  const before = new Map(allOptions(older).map((o) => [key(o.title), o]));
  const after = new Map(allOptions(newer).map((o) => [key(o.title), o]));
  const changed: OptionChange[] = [];
  for (const [k, n] of after) {
    const o = before.get(k);
    if (!o) continue;
    const salaryMaxDelta = n.salaryBrl.max - o.salaryBrl.max;
    const salaryMinDelta = n.salaryBrl.min - o.salaryBrl.min;
    if (salaryMaxDelta !== 0 || salaryMinDelta !== 0 || o.stress !== n.stress) {
      changed.push({ title: n.title, salaryMaxDelta, salaryMinDelta, stressFrom: o.stress, stressTo: n.stress });
    }
  }

  const oldTop = older.result.options[0]?.title ?? "";
  const newTop = newer.result.options[0]?.title ?? "";
  const same = (a: string, b: string) => key(a) === key(b);

  return {
    older,
    newer,
    profile: {
      role: same(older.summary.currentRole, newer.summary.currentRole) ? null : { from: older.summary.currentRole, to: newer.summary.currentRole },
      seniority: same(older.summary.seniority, newer.summary.seniority) ? null : { from: older.summary.seniority, to: newer.summary.seniority },
      careerYearsDelta: newer.summary.careerYears - older.summary.careerYears,
      skillsAdded: skills.added,
      skillsRemoved: skills.removed,
      certificationsAdded: certs.added,
      certificationsRemoved: certs.removed,
    },
    options: {
      top: same(oldTop, newTop) ? null : { from: oldTop, to: newTop },
      added: [...after].filter(([k]) => !before.has(k)).map(([, o]) => o),
      removed: [...before].filter(([k]) => !after.has(k)).map(([, o]) => o),
      changed,
    },
  };
}
