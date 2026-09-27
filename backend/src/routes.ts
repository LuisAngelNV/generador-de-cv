import { Router } from 'express';
import { createAuthRouter } from './modules/auth/auth.routes';
import { createCvsRouter } from './modules/cvs/cvs.routes';
import { healthRouter } from './modules/health/health.routes';

export function createApiRouter(): Router {
  const router = Router();

  router.use('/health', healthRouter);
  router.use('/auth', createAuthRouter());
  router.use('/cvs', createCvsRouter());

  return router;
}
