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
  startDate: string;
  endDate: string;
}

export interface LinkedInCertification {
  name: string;
  authority: string;
  finishedOn: string;
}

export interface LinkedInProfile {
  fullName: string;
  headline: string;
  summary: string;
  industry: string;
  location: string;
  currentTitle: string;
  currentCompany: string;
  careerMonths: number;
  positions: LinkedInPosition[];
  skills: string[];
  education: LinkedInEducation[];
  certifications: LinkedInCertification[];
}
