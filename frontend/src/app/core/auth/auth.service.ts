import { Injectable, computed, inject, signal } from '@angular/core';
import { Observable, catchError, finalize, map, of, shareReplay, tap, throwError } from 'rxjs';

import { ApiClient } from '../api/api-client.service';
import {
  AuthResponse,
  AuthTokens,
  LoginRequest,
  RegisterRequest,
  User,
  homeForRoles,
} from '../models/user.model';

/**
 * Authentication state.
 *
 * The access token is kept in memory only (never in local storage); the
 * refresh token lives in an HttpOnly cookie the API sets, so JavaScript never
 * reads it. A 401 triggers one refresh attempt through `refresh()`.
 */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly api = inject(ApiClient);

  private readonly userSignal = signal<User | null>(null);
  private readonly accessTokenSignal = signal<string | null>(null);
  private refreshInFlight: Observable<AuthTokens> | null = null;

  readonly user = this.userSignal.asReadonly();
  readonly isSignedIn = computed(() => this.userSignal() !== null);
  readonly roles = computed(() => this.userSignal()?.roles ?? []);
  readonly permissions = computed(() => this.userSignal()?.permissions ?? []);

  get accessToken(): string | null {
    return this.accessTokenSignal();
  }

  login(credentials: LoginRequest): Observable<AuthResponse> {
    return this.api.post<AuthResponse>('auth/login', credentials).pipe(
      tap((response) => this.applySession(response)),
    );
  }

  register(payload: RegisterRequest): Observable<AuthResponse> {
    return this.api.post<AuthResponse>('auth/register', payload).pipe(
      tap((response) => this.applySession(response)),
    );
  }

  /** Rotate the refresh token and keep the new access token in memory. */
  refresh(): Observable<AuthTokens> {
    if (this.refreshInFlight) {
      return this.refreshInFlight;
    }
    this.refreshInFlight = this.api.post<AuthTokens>('auth/refresh', {}).pipe(
      tap((tokens) => this.accessTokenSignal.set(tokens.access_token)),
      finalize(() => {
        this.refreshInFlight = null;
      }),
      shareReplay(1),
    );
    return this.refreshInFlight;
  }

  logout(): Observable<void> {
    return this.api.post<void>('auth/logout', {}).pipe(
      catchError(() => of(undefined)),
      finalize(() => this.clearSession()),
      map(() => undefined),
    );
  }

  /** Load the signed-in person's profile (used after a page reload). */
  loadProfile(): Observable<User> {
    return this.api.get<User>('users/me').pipe(
      tap((user) => this.userSignal.set(user)),
      catchError((error) => {
        this.clearSession();
        return throwError(() => error);
      }),
    );
  }

  clearSession(): void {
    this.userSignal.set(null);
    this.accessTokenSignal.set(null);
  }

  hasRole(...roles: string[]): boolean {
    const current = this.roles();
    return roles.some((role) => current.includes(role));
  }

  hasPermission(permission: string): boolean {
    return this.permissions().includes(permission);
  }

  /** The first screen the signed-in person's role opens. */
  homeRoute(): string {
    return homeForRoles(this.roles());
  }

  private applySession(response: AuthResponse): void {
    this.accessTokenSignal.set(response.access_token);
    this.userSignal.set(response.user);
  }
}
