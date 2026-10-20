export interface LinkedInPosition {
  company: string;
  title: string;
  description: string;
  location: string;
  startedOn: string;
  finishedOn: string;
}

export interface LinkedInEducation {
  school: string;
  degree: string;
  startedOn: string;
  finishedOn: string;
}

export interface LinkedInCertification {
  name: string;
  authority: string;
  startedOn: string;
  finishedOn: string;
}

export interface LinkedInProfile {
  fullName: string;
  headline: string;
  summary: string;
  location: string;
  currentTitle: string;
  positions: LinkedInPosition[];
  skills: string[];
  education: LinkedInEducation[];
  certifications: LinkedInCertification[];
  careerMonths: number;
  /** De onde veio o perfil: export completo (.zip) ou PDF do perfil. */
  source?: "zip" | "pdf";
  /** Texto bruto do PDF do perfil (a IA estrutura na análise). */
  rawText?: string;
}
