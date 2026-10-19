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
}
