import { Router } from 'express';
import { createRateLimiter } from '../../middlewares/rate-limit';
import { requireAuth } from '../../middlewares/require-auth';
import { validate } from '../../middlewares/validate';
import * as pdfController from '../pdf/pdf.controller';
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
  router.get('/:cvId/preview', validate({ params }), pdfController.preview);
  router.get(
    '/:cvId/pdf',
    // Rendering a PDF launches a browser page, so it is limited to protect the server.
    createRateLimiter({ windowMs: 60 * 1000, limit: 20 }),
    validate({ params }),
    pdfController.download,
  );

  for (const section of SECTIONS) {
    router.use(`/:cvId/${section.path}`, createSectionRouter(section));
  }

  return router;
}
