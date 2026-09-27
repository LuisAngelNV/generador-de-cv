export type CvLanguage = 'es' | 'en';
export type SkillLevel = 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED' | 'EXPERT';
export type LanguageProficiency = 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2' | 'NATIVE';

/** Dates travel as ISO strings; calendar dates are sent as YYYY-MM-DD. */
type IsoDate = string;

export interface CvSummary {
  id: string;
  title: string;
  templateId: string;
  language: CvLanguage;
  fullName: string;
  headline: string | null;
  createdAt: IsoDate;
  updatedAt: IsoDate;
}

export interface CvLink {
  label: string;
  url: string;
}

export interface CvProfile {
  title: string;
  templateId: string;
  language: CvLanguage;
  fullName: string;
  headline: string | null;
  summary: string | null;
  email: string | null;
  phone: string | null;
  location: string | null;
  links: CvLink[];
}

interface SectionItemBase {
  id: string;
  cvId: string;
  order: number;
  createdAt: IsoDate;
  updatedAt: IsoDate;
}

export interface Experience extends SectionItemBase {
  position: string;
  company: string;
  location: string | null;
  startDate: IsoDate;
  endDate: IsoDate | null;
  isCurrent: boolean;
  description: string | null;
}

export interface Education extends SectionItemBase {
  institution: string;
  degree: string;
  fieldOfStudy: string | null;
  location: string | null;
  startDate: IsoDate | null;
  endDate: IsoDate | null;
  isCurrent: boolean;
  description: string | null;
}

export interface Skill extends SectionItemBase {
  name: string;
  level: SkillLevel | null;
}

export interface Language extends SectionItemBase {
  name: string;
  proficiency: LanguageProficiency;
}

export interface Project extends SectionItemBase {
  name: string;
  role: string | null;
  url: string | null;
  startDate: IsoDate | null;
  endDate: IsoDate | null;
  description: string | null;
}

export interface Certification extends SectionItemBase {
  name: string;
  issuer: string;
  issueDate: IsoDate | null;
  expirationDate: IsoDate | null;
  credentialId: string | null;
  credentialUrl: string | null;
}

/** Section URL segment → item type. */
export interface CvSections {
  experiences: Experience;
  educations: Education;
  skills: Skill;
  languages: Language;
  projects: Project;
  certifications: Certification;
}

export type CvSectionKey = keyof CvSections;

/** Fields the client can send when creating or updating an item. */
export type SectionItemInput<K extends CvSectionKey> = Omit<CvSections[K], keyof SectionItemBase>;

export type CvDetail = CvSummary & CvProfile & { [K in CvSectionKey]: CvSections[K][] };

export interface CreateCvRequest {
  title: string;
  language?: CvLanguage;
}

export function toCvSummary(cv: CvDetail): CvSummary {
  const { id, title, templateId, language, fullName, headline, createdAt, updatedAt } = cv;
  return { id, title, templateId, language, fullName, headline, createdAt, updatedAt };
}
