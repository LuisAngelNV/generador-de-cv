import { HttpErrorResponse } from '@angular/common/http';

export interface ApiErrorDetail {
  path: string;
  message: string;
}

export interface ApiError {
  code: string;
  message: string;
  details: ApiErrorDetail[];
}

/** Extracts the backend's standard `{ error: { code, message, details } }` body, if present. */
export function getApiError(error: unknown): ApiError | null {
  if (!(error instanceof HttpErrorResponse)) return null;
  const body: unknown = error.error;
  if (typeof body !== 'object' || body === null || !('error' in body)) return null;
  const apiError = body.error as Partial<ApiError> | null;
  if (typeof apiError?.code !== 'string' || typeof apiError.message !== 'string') return null;
  return {
    code: apiError.code,
    message: apiError.message,
    details: Array.isArray(apiError.details) ? apiError.details : [],
  };
}

/** A message that can be shown to the user for any failed request. */
export function getApiErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof HttpErrorResponse && error.status === 0) {
    return 'No se puede conectar con el servidor. Comprueba tu conexión e inténtalo de nuevo.';
  }
  return getApiError(error)?.message ?? fallback;
}
