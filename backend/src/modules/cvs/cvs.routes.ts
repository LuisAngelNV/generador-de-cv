import { Router } from 'express';
import { requireAuth } from '../../middlewares/require-auth';
import { validate } from '../../middlewares/validate';
import * as cvsController from './cvs.controller';
import { createCvSchema, cvParamsSchema, updateCvSchema } from './cvs.schema';
import { SECTIONS } from './sections/sections.config';
import { createSectionRouter } from './sections/sections.routes';

export function createCvsRouter(): Router {
  const router = Router();
  const params = cvParamsSchema;

  router.use(requireAuth);

  router.get('/', cvsController.list);
  router.post('/', validate({ body: createCvSchema }), cvsController.create);
  router.get('/:cvId', validate({ params }), cvsController.get);
  router.patch('/:cvId', validate({ params, body: updateCvSchema }), cvsController.update);
  router.delete('/:cvId', validate({ params }), cvsController.remove);
  router.post('/:cvId/duplicate', validate({ params }), cvsController.duplicate);

  for (const section of SECTIONS) {
    router.use(`/:cvId/${section.path}`, createSectionRouter(section));
  }

  return router;
}
