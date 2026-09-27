import { rateLimit, type Options } from 'express-rate-limit';
import { AppError } from '../lib/app-error';

type RateLimitOptions = Pick<Options, 'windowMs' | 'limit'> &
  Partial<Pick<Options, 'skipSuccessfulRequests'>>;

export function createRateLimiter(options: RateLimitOptions) {
  return rateLimit({
    ...options,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    handler: (_req, _res, next) => {
      next(
        new AppError(
          429,
          'TOO_MANY_REQUESTS',
          'Demasiados intentos. Espera unos minutos e inténtalo de nuevo',
        ),
      );
    },
  });
}
