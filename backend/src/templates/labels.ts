import type { LanguageProficiency, SkillLevel } from '../generated/prisma/enums';

export interface TemplateLabels {
  summary: string;
  experiences: string;
  educations: string;
  skills: string;
  languages: string;
  projects: string;
  certifications: string;
  present: string;
  expires: string;
  credential: string;
  skillLevels: Record<SkillLevel, string>;
  proficiency: Record<LanguageProficiency, string>;
}

const cefr = { A1: 'A1', A2: 'A2', B1: 'B1', B2: 'B2', C1: 'C1', C2: 'C2' } as const;

export const LABELS: Record<'es' | 'en', TemplateLabels> = {
  es: {
    summary: 'Perfil',
    experiences: 'Experiencia',
    educations: 'Formación',
    skills: 'Habilidades',
    languages: 'Idiomas',
    projects: 'Proyectos',
    certifications: 'Certificaciones',
    present: 'Actualidad',
    expires: 'Caduca',
    credential: 'Ver credencial',
    skillLevels: {
      BEGINNER: 'Básico',
      INTERMEDIATE: 'Intermedio',
      ADVANCED: 'Avanzado',
      EXPERT: 'Experto',
    },
    proficiency: { ...cefr, NATIVE: 'Nativo' },
  },
  en: {
    summary: 'Profile',
    experiences: 'Experience',
    educations: 'Education',
    skills: 'Skills',
    languages: 'Languages',
    projects: 'Projects',
    certifications: 'Certifications',
    present: 'Present',
    expires: 'Expires',
    credential: 'View credential',
    skillLevels: {
      BEGINNER: 'Beginner',
      INTERMEDIATE: 'Intermediate',
      ADVANCED: 'Advanced',
      EXPERT: 'Expert',
    },
    proficiency: { ...cefr, NATIVE: 'Native' },
  },
};

export function labelsFor(language: string): TemplateLabels {
  return language === 'en' ? LABELS.en : LABELS.es;
}
