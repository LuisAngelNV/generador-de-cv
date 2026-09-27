import type { RequestHandler } from 'express';
import { AppError } from '../lib/app-error';

export const notFound: RequestHandler = (req, _res, next) => {
  next(new AppError(404, 'NOT_FOUND', `No existe la ruta ${req.method} ${req.path}`));
};
