import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, switchMap, throwError } from 'rxjs';
import { AuthService } from './auth.service';

// A 401 from these endpoints means wrong credentials or no session, never an expired access token.
const NO_REFRESH_URLS = [
  '/api/auth/login',
  '/api/auth/register',
  '/api/auth/refresh',
  '/api/auth/logout',
];

/** Sends the auth cookies and, on a 401, renews the session once and retries the request. */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  if (!req.url.startsWith('/api/')) {
    return next(req);
  }

  const request = req.clone({ withCredentials: true });
  if (NO_REFRESH_URLS.includes(req.url)) {
    return next(request);
  }

  const auth = inject(AuthService);

  return next(request).pipe(
    catchError((error: unknown) => {
      if (!(error instanceof HttpErrorResponse) || error.status !== 401) {
        return throwError(() => error);
      }
      return auth.refresh().pipe(
        catchError(() => {
          auth.handleSessionExpired();
          return throwError(() => error);
        }),
        switchMap(() => next(request)),
      );
    }),
  );
};
