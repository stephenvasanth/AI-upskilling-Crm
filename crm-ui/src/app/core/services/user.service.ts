import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import {
  UserCreateRequest,
  UserResponse,
  UserSelfUpdateRequest,
  UserUpdateRequest,
} from '../models/user.model';

const USERS_URL = `${environment.apiUrl}/users`;

/**
 * HTTP access for the `/api/users` resource and the `/api/auth/register`
 * user-creation endpoint (requirements AUTH-04 to AUTH-07).
 */
@Injectable({ providedIn: 'root' })
export class UserService {
  private readonly http = inject(HttpClient);

  /**
   * Loads every user, ordered by name (`GET /api/users`). Available to any
   * authenticated user; also used to populate the owner-selection control on
   * the contact form (requirement CON-01).
   *
   * @returns all users
   */
  getUsers(): Observable<UserResponse[]> {
    return this.http.get<UserResponse[]>(USERS_URL);
  }

  /**
   * Loads a single user by id (`GET /api/users/{id}`).
   *
   * @param id the user id
   * @returns the user's profile
   */
  getUser(id: number): Observable<UserResponse> {
    return this.http.get<UserResponse>(`${USERS_URL}/${id}`);
  }

  /**
   * Loads the authenticated user's own profile (`GET /api/users/me`,
   * requirement AUTH-07).
   *
   * @returns the current user's profile
   */
  getOwnProfile(): Observable<UserResponse> {
    return this.http.get<UserResponse>(`${USERS_URL}/me`);
  }

  /**
   * Updates the authenticated user's own name and, optionally, password
   * (`PUT /api/users/me`, requirement AUTH-07).
   *
   * @param request the new profile field values
   * @returns the updated profile
   */
  updateOwnProfile(request: UserSelfUpdateRequest): Observable<UserResponse> {
    return this.http.put<UserResponse>(`${USERS_URL}/me`, request);
  }

  /**
   * Updates a user's profile, role, and active status (`PUT /api/users/{id}`,
   * ADMIN only, requirements AUTH-05/AUTH-06).
   *
   * @param id the user id to update
   * @param request the new field values
   * @returns the updated user
   */
  updateUser(id: number, request: UserUpdateRequest): Observable<UserResponse> {
    return this.http.put<UserResponse>(`${USERS_URL}/${id}`, request);
  }

  /**
   * Creates a new team member account (`POST /api/auth/register`, ADMIN
   * only, requirement AUTH-04).
   *
   * @param request the new user's profile, password, and role
   * @returns the created user
   */
  registerUser(request: UserCreateRequest): Observable<UserResponse> {
    return this.http.post<UserResponse>(`${environment.apiUrl}/auth/register`, request);
  }
}
