import cookieParser from 'cookie-parser';
import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import { env } from './config/env';
import { errorHandler } from './middlewares/error-handler';
import { notFound } from './middlewares/not-found';
import { createApiRouter } from './routes';

export function createApp() {
  const app = express();

  // Behind proxies (Netlify → Render) the real client IP is in X-Forwarded-For.
  app.set('trust proxy', env.TRUST_PROXY);

  app.use(helmet());
  app.use(
    cors({
      origin: env.CORS_ORIGIN,
      credentials: true,
      // Lets the frontend read the PDF filename.
      exposedHeaders: ['Content-Disposition'],
    }),
  );
  app.use(express.json({ limit: '1mb' }));
  app.use(cookieParser());

  app.use('/api', createApiRouter());

  app.use(notFound);
  app.use(errorHandler);

  return app;
}
