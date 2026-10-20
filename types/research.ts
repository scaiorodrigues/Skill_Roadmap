import type { LinkedInProfile } from "./linkedin";
import type { ProfileSummary, RoadmapOptions } from "./career";

/** Uma pesquisa feita pelo usuário. Fica guardada só no aparelho dele. */
export interface Research {
  id: string;
  createdAt: string;
  title: string;
  profile: LinkedInProfile;
  summary: ProfileSummary;
  result: RoadmapOptions;
}

/** Registro de uma comparação já feita entre duas pesquisas. */
export interface ComparisonRecord {
  id: string;
  createdAt: string;
  aId: string;
  bId: string;
}

export interface Backup {
  version: 1;
  exportedAt: string;
  researches: Research[];
  comparisons: ComparisonRecord[];
}
