import { UserResponse } from './user.model';

/** Credentials submitted to `POST /api/auth/login`. Mirrors `LoginRequest`. */
export interface LoginRequest {
  email: string;
  password: string;
}

/** Response returned by `POST /api/auth/login`. Mirrors `LoginResponse`. */
export interface LoginResponse {
  token: string;
  user: UserResponse;
}
