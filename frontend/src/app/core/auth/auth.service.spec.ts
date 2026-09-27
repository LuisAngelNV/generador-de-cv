import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { User } from './auth.models';
import { AuthService } from './auth.service';

const user: User = {
  id: '1',
  email: 'ana@example.com',
  name: 'Ana',
  createdAt: '2026-01-01T00:00:00.000Z',
};

describe('AuthService', () => {
  let service: AuthService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    });
    service = TestBed.inject(AuthService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('restores the session from /me', async () => {
    const loading = service.loadSession();
    http.expectOne('/api/auth/me').flush({ user });
    await loading;

    expect(service.user()).toEqual(user);
    expect(service.isAuthenticated()).toBe(true);
  });

  it('resolves without a session when /me fails', async () => {
    const loading = service.loadSession();
    http.expectOne('/api/auth/me').flush(null, { status: 401, statusText: 'Unauthorized' });
    await loading;

    expect(service.isAuthenticated()).toBe(false);
  });

  it('stores the user after login', () => {
    service.login({ email: user.email, password: 'Secreta123' }).subscribe();
    const req = http.expectOne('/api/auth/login');
    expect(req.request.method).toBe('POST');
    req.flush({ user });

    expect(service.user()).toEqual(user);
  });

  it('shares a single refresh request between concurrent callers', () => {
    const results: User[] = [];
    service.refresh().subscribe((u) => results.push(u));
    service.refresh().subscribe((u) => results.push(u));

    http.expectOne('/api/auth/refresh').flush({ user });

    expect(results).toEqual([user, user]);
  });

  it('clears the user and goes to /login on logout, even if the request fails', () => {
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    service.login({ email: user.email, password: 'Secreta123' }).subscribe();
    http.expectOne('/api/auth/login').flush({ user });

    service.logout().subscribe();
    http.expectOne('/api/auth/logout').flush(null, { status: 500, statusText: 'Error' });

    expect(service.isAuthenticated()).toBe(false);
    expect(navigate).toHaveBeenCalledWith(['/login']);
  });
});
