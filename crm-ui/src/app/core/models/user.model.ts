/** Role assigned to a user (crm-service `entity/UserRole.java`). */
export type UserRole = 'ADMIN' | 'USER';

/** Public view of a user, excluding the password hash. Mirrors `UserResponse`. */
export interface UserResponse {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  role: UserRole;
  active: boolean;
  createdAt: string;
}

/** Request body for `POST /api/auth/register` (ADMIN only). Mirrors `UserCreateRequest`. */
export interface UserCreateRequest {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  role: UserRole;
}

/**
 * Request body for `PUT /api/users/{id}` (ADMIN only). Mirrors `UserUpdateRequest`.
 * `password` is `null`/omitted to leave the password unchanged.
 */
export interface UserUpdateRequest {
  firstName: string;
  lastName: string;
  password?: string | null;
  role: UserRole;
  active: boolean;
}

/**
 * Request body for `PUT /api/users/me` (requirement AUTH-07). Mirrors
 * `UserSelfUpdateRequest`. `password` is `null`/omitted to leave the password
 * unchanged.
 */
export interface UserSelfUpdateRequest {
  firstName: string;
  lastName: string;
  password?: string | null;
}
