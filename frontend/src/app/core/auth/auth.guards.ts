import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from './auth.service';

export const HOME_AFTER_LOGIN = '/cvs';

/** Only for signed-in users; the rest are sent to the login page. */
export const authGuard: CanActivateFn = (_route, state) => {
  if (inject(AuthService).isAuthenticated()) {
    return true;
  }
  return inject(Router).createUrlTree(['/login'], { queryParams: { returnUrl: state.url } });
};

/** Only for anonymous users (login, register); signed-in users go to their CVs. */
export const guestGuard: CanActivateFn = () => {
  if (!inject(AuthService).isAuthenticated()) {
    return true;
  }
  return inject(Router).createUrlTree([HOME_AFTER_LOGIN]);
};

/** Accepts only paths inside the app, so a crafted returnUrl cannot redirect to another site. */
export function safeReturnUrl(returnUrl: string | null | undefined): string {
  if (returnUrl?.startsWith('/') && !returnUrl.startsWith('//') && !returnUrl.startsWith('/\\')) {
    return returnUrl;
  }
  return HOME_AFTER_LOGIN;
}
