import { Router, type Request, type Response } from 'express';
import { z } from 'zod';
import { getAuthUserId } from '../../../middlewares/require-auth';
import { validate } from '../../../middlewares/validate';
import { uuidParam } from '../cvs.fields';
import { cvParamsSchema } from '../cvs.schema';
import type { SectionDefinition } from './sections.config';
import { createSectionService } from './sections.service';

const itemParamsSchema = cvParamsSchema.extend({ itemId: uuidParam });
const reorderSchema = z.object({ ids: z.array(uuidParam).max(200) });

type SectionRequest = Request<{ cvId: string; itemId: string }>;

/**
 * Routes for one CV section, mounted at /api/cvs/:cvId/<section.path>:
 * GET / · POST / · PUT /order · PATCH /:itemId · DELETE /:itemId
 */
export function createSectionRouter(section: SectionDefinition): Router {
  const service = createSectionService(section);
  const router = Router({ mergeParams: true });

  router.get(
    '/',
    validate({ params: cvParamsSchema }),
    async (req: SectionRequest, res: Response) => {
      res.json({ items: await service.list(getAuthUserId(res), req.params.cvId) });
    },
  );

  router.post(
    '/',
    validate({ params: cvParamsSchema, body: section.createSchema }),
    async (req: SectionRequest, res: Response) => {
      const item = await service.create(
        getAuthUserId(res),
        req.params.cvId,
        req.body as Record<string, unknown>,
      );
      res.status(201).json({ item });
    },
  );

  router.put(
    '/order',
    validate({ params: cvParamsSchema, body: reorderSchema }),
    async (req: SectionRequest, res: Response) => {
      const { ids } = req.body as z.infer<typeof reorderSchema>;
      res.json({ items: await service.reorder(getAuthUserId(res), req.params.cvId, ids) });
    },
  );

  router.patch(
    '/:itemId',
    validate({ params: itemParamsSchema, body: section.updateSchema }),
    async (req: SectionRequest, res: Response) => {
      const item = await service.update(
        getAuthUserId(res),
        req.params.cvId,
        req.params.itemId,
        req.body as Record<string, unknown>,
      );
      res.json({ item });
    },
  );

  router.delete(
    '/:itemId',
    validate({ params: itemParamsSchema }),
    async (req: SectionRequest, res: Response) => {
      await service.remove(getAuthUserId(res), req.params.cvId, req.params.itemId);
      res.status(204).end();
    },
  );

  return router;
}
