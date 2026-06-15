import { computed, inject, Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';

import { environment } from '../../../environments/environment';
import { LoginRequest, LoginResponse } from '../models/auth.model';
import { UserResponse } from '../models/user.model';

const TOKEN_KEY = 'crm.token';
const USER_KEY = 'crm.user';

/**
 * Owns the authenticated session: login/logout, the JWT bearer token, and
 * the current user's profile. The token and user are persisted to
 * `localStorage` so the session survives a page reload, and exposed as
 * signals so `jwtInterceptor` and the route guards can read them
 * synchronously.
 */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);

  /** The current JWT bearer token, or `null` if not logged in. */
  readonly token = signal<string | null>(localStorage.getItem(TOKEN_KEY));

  /** The currently authenticated user's profile, or `null` if not logged in. */
  readonly currentUser = signal<UserResponse | null>(readStoredUser());

  /** `true` once a token is present. */
  readonly isAuthenticated = computed(() => this.token() !== null);

  /** `true` if the current user has the `ADMIN` role. */
  readonly isAdmin = computed(() => this.currentUser()?.role === 'ADMIN');

  /**
   * Submits credentials to `POST /api/auth/login` (requirement AUTH-01) and,
   * on success, stores the returned token and user profile (`token`,
   * `currentUser` signals and `localStorage`).
   *
   * @param request the email/password to authenticate with
   * @returns the login response containing the token and user profile
   */
  login(request: LoginRequest): Observable<LoginResponse> {
    return this.http
      .post<LoginResponse>(`${environment.apiUrl}/auth/login`, request)
      .pipe(tap((response) => this.setSession(response)));
  }

  /**
   * Clears the session: removes the token and user profile from
   * `localStorage` and resets the `token`/`currentUser` signals to `null`.
   */
  logout(): void {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    this.token.set(null);
    this.currentUser.set(null);
  }

  /**
   * Updates the cached profile for the current session (e.g. after the user
   * edits their own name via `PUT /api/users/me`, requirement AUTH-07),
   * without affecting the token.
   *
   * @param user the updated user profile to store
   */
  setCurrentUser(user: UserResponse): void {
    localStorage.setItem(USER_KEY, JSON.stringify(user));
    this.currentUser.set(user);
  }

  /**
   * Persists a successful login: writes the token and user profile to
   * `localStorage` and updates the `token`/`currentUser` signals.
   *
   * @param response the login response to persist
   */
  private setSession(response: LoginResponse): void {
    localStorage.setItem(TOKEN_KEY, response.token);
    localStorage.setItem(USER_KEY, JSON.stringify(response.user));
    this.token.set(response.token);
    this.currentUser.set(response.user);
  }
}

/**
 * Reads and parses the persisted user profile from `localStorage`.
 *
 * @returns the stored user profile, or `null` if absent or invalid
 */
function readStoredUser(): UserResponse | null {
  const raw = localStorage.getItem(USER_KEY);
  if (!raw) {
    return null;
  }
  try {
    return JSON.parse(raw) as UserResponse;
  } catch {
    return null;
  }
}
