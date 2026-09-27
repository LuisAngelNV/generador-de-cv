import type { ErrorRequestHandler } from 'express';
import { ZodError } from 'zod';
import { env } from '../config/env';
import { AppError } from '../lib/app-error';

interface ErrorBody {
  error: { code: string; message: string; details: unknown[] };
}

function isJsonSyntaxError(err: unknown): boolean {
  return err instanceof SyntaxError && 'type' in err && err.type === 'entity.parse.failed';
}

export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  let status = 500;
  let body: ErrorBody = {
    error: { code: 'INTERNAL_ERROR', message: 'Ha ocurrido un error inesperado', details: [] },
  };

  if (err instanceof AppError) {
    status = err.statusCode;
    body = { error: { code: err.code, message: err.message, details: err.details } };
  } else if (err instanceof ZodError) {
    status = 400;
    body = {
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Los datos enviados no son válidos',
        details: err.issues.map((issue) => ({
          path: issue.path.join('.'),
          message: issue.message,
        })),
      },
    };
  } else if (isJsonSyntaxError(err)) {
    status = 400;
    body = {
      error: {
        code: 'INVALID_JSON',
        message: 'El cuerpo de la petición no es JSON válido',
        details: [],
      },
    };
  }

  if (status >= 500 && env.NODE_ENV !== 'test') {
    console.error(err);
  }

  res.status(status).json(body);
};
