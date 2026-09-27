import { AppError } from '../../../lib/app-error';
import { prisma } from '../../../lib/prisma';
import { endAfterStart, endAfterStartError } from '../cvs.fields';
import { assertCvOwner, touchCv } from '../cvs.service';
import type { SectionDefinition, SectionItem } from './sections.config';

const itemNotFound = () =>
  new AppError(404, 'ITEM_NOT_FOUND', 'No se ha encontrado el elemento en este CV');

export interface SectionService {
  list(userId: string, cvId: string): Promise<SectionItem[]>;
  create(userId: string, cvId: string, data: Record<string, unknown>): Promise<SectionItem>;
  update(
    userId: string,
    cvId: string,
    itemId: string,
    data: Record<string, unknown>,
  ): Promise<SectionItem>;
  remove(userId: string, cvId: string, itemId: string): Promise<void>;
  reorder(userId: string, cvId: string, ids: string[]): Promise<SectionItem[]>;
}

export function createSectionService(section: SectionDefinition): SectionService {
  const byOrder = { orderBy: { order: 'asc' } } as const;

  /** A partial update can break the date range together with the stored values. */
  function assertDateRange(existing: SectionItem, data: Record<string, unknown>): void {
    const range = section.dateRange;
    if (!range) return;

    const merged = { ...existing, ...data };
    const isValid = endAfterStart({
      startDate: merged[range.start] as Date | null,
      endDate: merged[range.end] as Date | null,
    });
    if (!isValid) {
      throw new AppError(400, 'VALIDATION_ERROR', 'Los datos enviados no son válidos', [
        { path: range.end, message: endAfterStartError.message },
      ]);
    }
  }

  return {
    async list(userId, cvId) {
      await assertCvOwner(prisma, userId, cvId);
      return section.delegate(prisma).findMany({ where: { cvId }, ...byOrder });
    },

    /** New items are added at the end of the section. */
    create(userId, cvId, data) {
      return prisma.$transaction(async (tx) => {
        await assertCvOwner(tx, userId, cvId);
        const delegate = section.delegate(tx);
        const items = await delegate.findMany({ where: { cvId }, ...byOrder });
        const order = items.reduce((max, item) => Math.max(max, item.order), -1) + 1;
        const item = await delegate.create({ data: { ...data, cvId, order } });
        await touchCv(tx, cvId);
        return item;
      });
    },

    update(userId, cvId, itemId, data) {
      return prisma.$transaction(async (tx) => {
        await assertCvOwner(tx, userId, cvId);
        const delegate = section.delegate(tx);
        const existing = await delegate.findFirst({ where: { id: itemId, cvId } });
        if (!existing) {
          throw itemNotFound();
        }
        assertDateRange(existing, data);
        const item = await delegate.update({ where: { id: itemId }, data });
        await touchCv(tx, cvId);
        return item;
      });
    },

    async remove(userId, cvId, itemId) {
      await prisma.$transaction(async (tx) => {
        await assertCvOwner(tx, userId, cvId);
        const delegate = section.delegate(tx);
        const existing = await delegate.findFirst({ where: { id: itemId, cvId } });
        if (!existing) {
          throw itemNotFound();
        }
        await delegate.delete({ where: { id: itemId } });
        await touchCv(tx, cvId);
      });
    },

    /** `ids` must list every item of the section exactly once, in the new order. */
    reorder(userId, cvId, ids) {
      return prisma.$transaction(async (tx) => {
        await assertCvOwner(tx, userId, cvId);
        const delegate = section.delegate(tx);
        const items = await delegate.findMany({ where: { cvId }, ...byOrder });

        const currentIds = new Set(items.map((item) => item.id));
        const sameItems =
          ids.length === currentIds.size &&
          new Set(ids).size === ids.length &&
          ids.every((id) => currentIds.has(id));
        if (!sameItems) {
          throw new AppError(
            400,
            'INVALID_ORDER',
            'El nuevo orden debe incluir todos los elementos de la sección, sin repetir ninguno',
          );
        }

        for (const [order, id] of ids.entries()) {
          await delegate.update({ where: { id }, data: { order } });
        }
        await touchCv(tx, cvId);
        return delegate.findMany({ where: { cvId }, ...byOrder });
      });
    },
  };
}
