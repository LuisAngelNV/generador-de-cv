import { Router } from 'express';
import { createRateLimiter } from '../../middlewares/rate-limit';
import { requireAuth } from '../../middlewares/require-auth';
import { validate } from '../../middlewares/validate';
import * as authController from './auth.controller';
import { loginSchema, registerSchema } from './auth.schema';

const FIFTEEN_MINUTES = 15 * 60 * 1000;

/** A factory, so every app instance (and every test) gets its own rate limit counters. */
export function createAuthRouter(): Router {
  const router = Router();

  router.post(
    '/register',
    createRateLimiter({ windowMs: FIFTEEN_MINUTES, limit: 10 }),
    validate({ body: registerSchema }),
    authController.register,
  );
  router.post(
    '/login',
    // Only failed attempts count towards the limit.
    createRateLimiter({ windowMs: FIFTEEN_MINUTES, limit: 10, skipSuccessfulRequests: true }),
    validate({ body: loginSchema }),
    authController.login,
  );
  router.post('/refresh', authController.refresh);
  router.post('/logout', authController.logout);
  router.get('/me', requireAuth, authController.me);

  return router;
}
