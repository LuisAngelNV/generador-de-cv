import { HttpClient } from '@angular/common/http';
import { computed, inject, Injectable, signal } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, finalize, firstValueFrom, map, Observable, of, shareReplay, tap } from 'rxjs';
import { AuthResponse, LoginRequest, RegisterRequest, User } from './auth.models';

const API = '/api/auth';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);

  private readonly currentUser = signal<User | null>(null);
  private refreshInFlight: Observable<User> | null = null;

  readonly user = this.currentUser.asReadonly();
  readonly isAuthenticated = computed(() => this.currentUser() !== null);

  /** Restores the session on startup. Always resolves, with or without a session. */
  loadSession(): Promise<void> {
    return firstValueFrom(
      this.http.get<AuthResponse>(`${API}/me`).pipe(
        map(({ user }) => user),
        catchError(() => of(null)),
      ),
    ).then((user) => this.currentUser.set(user));
  }

  register(data: RegisterRequest): Observable<User> {
    return this.http.post<AuthResponse>(`${API}/register`, data).pipe(
      map(({ user }) => user),
      tap((user) => this.currentUser.set(user)),
    );
  }

  login(data: LoginRequest): Observable<User> {
    return this.http.post<AuthResponse>(`${API}/login`, data).pipe(
      map(({ user }) => user),
      tap((user) => this.currentUser.set(user)),
    );
  }

  logout(): Observable<void> {
    return this.http.post<void>(`${API}/logout`, {}).pipe(
      catchError(() => of(undefined)),
      finalize(() => {
        this.currentUser.set(null);
        void this.router.navigate(['/login']);
      }),
    );
  }

  /**
   * Renews the session using the refresh token cookie. Concurrent callers share a single
   * request, because the backend treats a reused refresh token as stolen.
   */
  refresh(): Observable<User> {
    this.refreshInFlight ??= this.http.post<AuthResponse>(`${API}/refresh`, {}).pipe(
      map(({ user }) => user),
      tap((user) => this.currentUser.set(user)),
      finalize(() => (this.refreshInFlight = null)),
      shareReplay(1),
    );
    return this.refreshInFlight;
  }

  /** Called when the session can no longer be renewed. */
  handleSessionExpired(): void {
    const wasAuthenticated = this.isAuthenticated();
    this.currentUser.set(null);
    if (wasAuthenticated) {
      void this.router.navigate(['/login'], { queryParams: { returnUrl: this.router.url } });
    }
  }
}
