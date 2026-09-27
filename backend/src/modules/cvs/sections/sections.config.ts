import { z, type ZodType } from 'zod';
import { LanguageProficiency, SkillLevel } from '../../../generated/prisma/enums';
import type { Prisma } from '../../../generated/prisma/client';
import {
  calendarDate,
  endAfterStart,
  endAfterStartError,
  optionalCalendarDate,
  optionalHttpUrl,
  optionalText,
  requiredText,
} from '../cvs.fields';

export type Db = Prisma.TransactionClient;

export interface SectionItem {
  id: string;
  cvId: string;
  order: number;
  [field: string]: unknown;
}

/** The subset of a Prisma model delegate that the generic section service needs. */
export interface SectionDelegate {
  findMany(args: { where: { cvId: string }; orderBy: { order: 'asc' } }): Promise<SectionItem[]>;
  findFirst(args: { where: { id: string; cvId: string } }): Promise<SectionItem | null>;
  create(args: { data: Record<string, unknown> }): Promise<SectionItem>;
  update(args: { where: { id: string }; data: Record<string, unknown> }): Promise<SectionItem>;
  delete(args: { where: { id: string } }): Promise<SectionItem>;
}

export interface SectionDefinition {
  /** URL segment under /api/cvs/:cvId */
  path: string;
  delegate: (db: Db) => SectionDelegate;
  createSchema: ZodType<Record<string, unknown>>;
  updateSchema: ZodType<Record<string, unknown>>;
  /** Start/end fields that must stay in order, also when only one of them is updated. */
  dateRange?: { start: string; end: string };
}

const notEmpty = (data: object) => Object.keys(data).length > 0;
const notEmptyError = 'No hay ningún campo que actualizar';

/** An item marked as current has no end date. */
function clearEndDateIfCurrent<T extends { isCurrent?: boolean; endDate?: Date | null }>(
  data: T,
): T {
  return data.isCurrent ? { ...data, endDate: null } : data;
}

function defineSection<Shape extends z.ZodRawShape>(options: {
  path: string;
  delegate: (db: Db) => SectionDelegate;
  shape: Shape;
  dateRange?: { start: string; end: string };
  hasCurrentFlag?: boolean;
}): SectionDefinition {
  const base = z.object(options.shape);
  const range = options.dateRange;
  const rangeIsValid = (data: Record<string, unknown>) =>
    !range ||
    endAfterStart({
      startDate: data[range.start] as Date | null | undefined,
      endDate: data[range.end] as Date | null | undefined,
    });
  const rangeError = range ? { ...endAfterStartError, path: [range.end] } : endAfterStartError;
  const normalize = (data: Record<string, unknown>) =>
    options.hasCurrentFlag ? clearEndDateIfCurrent(data) : data;

  return {
    path: options.path,
    delegate: options.delegate,
    dateRange: range,
    createSchema: base.refine(rangeIsValid, rangeError).transform(normalize),
    updateSchema: base
      .partial()
      .refine(notEmpty, notEmptyError)
      .refine(rangeIsValid, rangeError)
      .transform(normalize),
  };
}

export const SECTIONS: SectionDefinition[] = [
  defineSection({
    path: 'experiences',
    delegate: (db) => db.experience,
    dateRange: { start: 'startDate', end: 'endDate' },
    hasCurrentFlag: true,
    shape: {
      position: requiredText(100),
      company: requiredText(100),
      location: optionalText(100),
      startDate: calendarDate,
      endDate: optionalCalendarDate,
      isCurrent: z.boolean().optional(),
      description: optionalText(2000),
    },
  }),
  defineSection({
    path: 'educations',
    delegate: (db) => db.education,
    dateRange: { start: 'startDate', end: 'endDate' },
    hasCurrentFlag: true,
    shape: {
      institution: requiredText(150),
      degree: requiredText(150),
      fieldOfStudy: optionalText(150),
      location: optionalText(100),
      startDate: optionalCalendarDate,
      endDate: optionalCalendarDate,
      isCurrent: z.boolean().optional(),
      description: optionalText(2000),
    },
  }),
  defineSection({
    path: 'skills',
    delegate: (db) => db.skill,
    shape: {
      name: requiredText(60),
      level: z.enum(SkillLevel).nullable().optional(),
    },
  }),
  defineSection({
    path: 'languages',
    delegate: (db) => db.language,
    shape: {
      name: requiredText(60),
      proficiency: z.enum(LanguageProficiency),
    },
  }),
  defineSection({
    path: 'projects',
    delegate: (db) => db.project,
    dateRange: { start: 'startDate', end: 'endDate' },
    shape: {
      name: requiredText(100),
      role: optionalText(100),
      url: optionalHttpUrl,
      startDate: optionalCalendarDate,
      endDate: optionalCalendarDate,
      description: optionalText(2000),
    },
  }),
  defineSection({
    path: 'certifications',
    delegate: (db) => db.certification,
    dateRange: { start: 'issueDate', end: 'expirationDate' },
    shape: {
      name: requiredText(150),
      issuer: requiredText(150),
      issueDate: optionalCalendarDate,
      expirationDate: optionalCalendarDate,
      credentialId: optionalText(100),
      credentialUrl: optionalHttpUrl,
    },
  }),
];
