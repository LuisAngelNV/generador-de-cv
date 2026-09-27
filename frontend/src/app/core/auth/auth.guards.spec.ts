import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import {
  ActivatedRouteSnapshot,
  provideRouter,
  Router,
  RouterStateSnapshot,
  UrlTree,
} from '@angular/router';
import { authGuard, guestGuard, safeReturnUrl } from './auth.guards';
import { AuthService } from './auth.service';

describe('auth guards', () => {
  const isAuthenticated = signal(false);

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideRouter([]), { provide: AuthService, useValue: { isAuthenticated } }],
    });
  });

  const runAuthGuard = (url: string) =>
    TestBed.runInInjectionContext(() =>
      authGuard({} as ActivatedRouteSnapshot, { url } as RouterStateSnapshot),
    );
  const runGuestGuard = () =>
    TestBed.runInInjectionContext(() =>
      guestGuard({} as ActivatedRouteSnapshot, {} as RouterStateSnapshot),
    );
  const serialize = (tree: unknown) => TestBed.inject(Router).serializeUrl(tree as UrlTree);

  it('authGuard sends anonymous users to /login keeping the requested url', () => {
    isAuthenticated.set(false);

    expect(serialize(runAuthGuard('/cvs'))).toBe('/login?returnUrl=%2Fcvs');
  });

  it('authGuard lets signed-in users through', () => {
    isAuthenticated.set(true);

    expect(runAuthGuard('/cvs')).toBe(true);
  });

  it('guestGuard sends signed-in users to their CVs', () => {
    isAuthenticated.set(true);

    expect(serialize(runGuestGuard())).toBe('/cvs');
  });

  it('safeReturnUrl only accepts paths inside the app', () => {
    expect(safeReturnUrl('/cvs/123')).toBe('/cvs/123');
    expect(safeReturnUrl('https://evil.example')).toBe('/cvs');
    expect(safeReturnUrl('//evil.example')).toBe('/cvs');
    expect(safeReturnUrl('/\\evil.example')).toBe('/cvs');
    expect(safeReturnUrl(undefined)).toBe('/cvs');
  });
});
