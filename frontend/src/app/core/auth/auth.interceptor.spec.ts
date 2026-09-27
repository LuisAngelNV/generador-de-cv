import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { authInterceptor } from './auth.interceptor';
import { AuthService } from './auth.service';

const user = { id: '1', email: 'ana@example.com', name: null, createdAt: '' };
const unauthorized = { status: 401, statusText: 'Unauthorized' };

describe('authInterceptor', () => {
  let client: HttpClient;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
        provideRouter([]),
      ],
    });
    client = TestBed.inject(HttpClient);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('sends API requests with credentials', () => {
    client.get('/api/cvs').subscribe();

    expect(http.expectOne('/api/cvs').request.withCredentials).toBe(true);
  });

  it('refreshes the session once and retries after a 401', () => {
    let body: unknown;
    client.get('/api/cvs').subscribe((res) => (body = res));

    http.expectOne('/api/cvs').flush(null, unauthorized);
    http.expectOne('/api/auth/refresh').flush({ user });
    http.expectOne('/api/cvs').flush([{ id: 'cv-1' }]);

    expect(body).toEqual([{ id: 'cv-1' }]);
  });

  it('uses a single refresh for several requests that fail at the same time', () => {
    client.get('/api/cvs').subscribe();
    client.get('/api/auth/me').subscribe();

    http.expectOne('/api/cvs').flush(null, unauthorized);
    http.expectOne('/api/auth/me').flush(null, unauthorized);
    http.expectOne('/api/auth/refresh').flush({ user });

    http.expectOne('/api/cvs').flush([]);
    http.expectOne('/api/auth/me').flush({ user });
  });

  it('ends the session and propagates the 401 when the refresh fails', () => {
    const expired = vi.spyOn(TestBed.inject(AuthService), 'handleSessionExpired');
    let status: number | undefined;
    client.get('/api/cvs').subscribe({ error: (err) => (status = err.status) });

    http.expectOne('/api/cvs').flush(null, unauthorized);
    http.expectOne('/api/auth/refresh').flush(null, unauthorized);

    expect(status).toBe(401);
    expect(expired).toHaveBeenCalled();
  });

  it('does not try to refresh after a failed login', () => {
    let status: number | undefined;
    client.post('/api/auth/login', {}).subscribe({ error: (err) => (status = err.status) });

    http.expectOne('/api/auth/login').flush(null, unauthorized);

    expect(status).toBe(401);
    http.expectNone('/api/auth/refresh');
  });
});
