export type Stress = "baixo" | "médio" | "alto";

export interface MoneyRange {
  min: number;
  max: number;
}

export interface CareerOption {
  id: string;
  title: string;
  summary: string;
  whyFit: string;
  /** Faixa mensal em reais (Brasil). */
  salaryBrl: MoneyRange;
  salaryRemote: string;
  salaryAbroad: string;
  geography: string;
  stress: Stress;
  stressNote: string;
  benefits: string[];
  complaints: string[];
  tags: string[];
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
