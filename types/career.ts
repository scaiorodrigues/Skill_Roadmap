export type Stress = "baixo" | "médio" | "alto";
export type RemoteAvailability = "comum" | "possível" | "raro";
export type Demand = "alta" | "média" | "baixa";

export interface MoneyRange {
  min: number;
  max: number;
}

/** Uma etapa do caminho (ex.: Analista Sênior), da posição atual até o topo. */
export interface PathStep {
  title: string;
  /** Experiência típica para a etapa, ex.: "2–4 anos". */
  years: string;
  salaryBrl: MoneyRange;
}

/** Quão comum é o home office no caminho, e a faixa do cargo do topo em home office. */
export interface RemoteInfo {
  availability: RemoteAvailability;
  salaryBrl: MoneyRange;
}

/** Onde as vagas se concentram, com a faixa do cargo do topo naquele lugar. */
export interface LocationInfo {
  place: string;
  demand: Demand;
  salaryBrl: MoneyRange;
}

export interface CareerOption {
  id: string;
  /** Nome do caminho (ex.: "Engenharia de Dados"). */
  title: string;
  summary: string;
  whyFit: string;
  /** Faixa mensal em reais do cargo do topo do caminho (o mais bem pago). */
  salaryBrl: MoneyRange;
  salaryRemote: string;
  salaryAbroad: string;
  geography: string;
  stress: Stress;
  stressNote: string;
  benefits: string[];
  complaints: string[];
  tags: string[];
  /** Etapas do caminho, da posição atual até o topo. Ausente em pesquisas antigas. */
  steps?: PathStep[];
  /** Cargo mais bem pago do caminho. Ausente em pesquisas antigas. */
  topRole?: { title: string; salaryBrl: MoneyRange };
  remote?: RemoteInfo;
  locations?: LocationInfo[];
}

export interface ProfileSummary {
  currentRole: string;
  seniority: string;
  careerYears: number;
  topSkills: string[];
  strengths: string[];
}

export interface RoadmapOptions {
  options: CareerOption[];
  custom: CareerOption | null;
  disclaimer: string;
  model: string;
}
