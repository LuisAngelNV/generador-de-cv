import type { Prisma } from '../../generated/prisma/client';
import { AppError } from '../../lib/app-error';
import { prisma } from '../../lib/prisma';
import type { CreateCvInput, UpdateCvInput } from './cvs.schema';
import type { Db } from './sections/sections.config';

const byOrder = { orderBy: { order: 'asc' } } as const;

const sectionsInclude = {
  experiences: byOrder,
  educations: byOrder,
  skills: byOrder,
  languages: byOrder,
  projects: byOrder,
  certifications: byOrder,
} satisfies Prisma.CvInclude;

const summarySelect = {
  id: true,
  title: true,
  templateId: true,
  language: true,
  fullName: true,
  headline: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.CvSelect;

export type CvSummary = Prisma.CvGetPayload<{ select: typeof summarySelect }>;
export type CvDetail = Prisma.CvGetPayload<{
  omit: { userId: true };
  include: typeof sectionsInclude;
}>;

const DUPLICATE_SUFFIX = ' (copia)';
const MAX_TITLE_LENGTH = 100;

export const cvNotFound = () => new AppError(404, 'CV_NOT_FOUND', 'No se ha encontrado el CV');

/**
 * Throws 404 unless the CV exists and belongs to the user. CVs of other users are
 * reported as not found, so their ids cannot be probed.
 */
export async function assertCvOwner(db: Db, userId: string, cvId: string): Promise<void> {
  const cv = await db.cv.findFirst({ where: { id: cvId, userId }, select: { id: true } });
  if (!cv) {
    throw cvNotFound();
  }
}

/** Marks the CV as modified, so the list shows the most recently edited CVs first. */
export async function touchCv(db: Db, cvId: string): Promise<void> {
  await db.cv.update({ where: { id: cvId }, data: { updatedAt: new Date() } });
}

export function listCvs(userId: string): Promise<CvSummary[]> {
  return prisma.cv.findMany({
    where: { userId },
    select: summarySelect,
    orderBy: { updatedAt: 'desc' },
  });
}

export async function getCv(userId: string, cvId: string): Promise<CvDetail> {
  const cv = await prisma.cv.findFirst({
    where: { id: cvId, userId },
    omit: { userId: true },
    include: sectionsInclude,
  });
  if (!cv) {
    throw cvNotFound();
  }
  return cv;
}

/** New CVs start with the user's name and email already filled in. */
export async function createCv(userId: string, input: CreateCvInput): Promise<CvDetail> {
  const user = await prisma.user.findUniqueOrThrow({
    where: { id: userId },
    select: { name: true, email: true },
  });

  return prisma.cv.create({
    data: {
      userId,
      title: input.title,
      language: input.language,
      fullName: user.name ?? '',
      email: user.email,
    },
    omit: { userId: true },
    include: sectionsInclude,
  });
}

export async function updateCv(
  userId: string,
  cvId: string,
  input: UpdateCvInput,
): Promise<CvDetail> {
  const { count } = await prisma.cv.updateMany({ where: { id: cvId, userId }, data: input });
  if (count === 0) {
    throw cvNotFound();
  }
  return getCv(userId, cvId);
}

export async function deleteCv(userId: string, cvId: string): Promise<void> {
  const { count } = await prisma.cv.deleteMany({ where: { id: cvId, userId } });
  if (count === 0) {
    throw cvNotFound();
  }
}

/** Drops the fields that the copy must not share with the original. */
function copyItems<T extends { id: string; cvId: string; createdAt: Date; updatedAt: Date }>(
  items: T[],
): Omit<T, 'id' | 'cvId' | 'createdAt' | 'updatedAt'>[] {
  return items.map(({ id: _id, cvId: _cvId, createdAt: _c, updatedAt: _u, ...data }) => data);
}

export async function duplicateCv(userId: string, cvId: string): Promise<CvDetail> {
  const {
    id: _id,
    createdAt: _createdAt,
    updatedAt: _updatedAt,
    title,
    links,
    experiences,
    educations,
    skills,
    languages,
    projects,
    certifications,
    ...profile
  } = await getCv(userId, cvId);

  const copyTitle =
    title.slice(0, MAX_TITLE_LENGTH - DUPLICATE_SUFFIX.length).trimEnd() + DUPLICATE_SUFFIX;

  return prisma.cv.create({
    data: {
      ...profile,
      userId,
      title: copyTitle,
      links: links ?? [],
      experiences: { createMany: { data: copyItems(experiences) } },
      educations: { createMany: { data: copyItems(educations) } },
      skills: { createMany: { data: copyItems(skills) } },
      languages: { createMany: { data: copyItems(languages) } },
      projects: { createMany: { data: copyItems(projects) } },
      certifications: { createMany: { data: copyItems(certifications) } },
    },
    omit: { userId: true },
    include: sectionsInclude,
  });
}
