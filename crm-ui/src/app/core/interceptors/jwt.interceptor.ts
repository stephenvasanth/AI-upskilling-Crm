import { inject } from '@angular/core';
import { HttpInterceptorFn } from '@angular/common/http';

import { AuthService } from '../services/auth.service';

/**
 * Attaches the current session's JWT as an `Authorization: Bearer <token>`
 * header to every outgoing request. Requests are passed through unchanged
 * when no token is present (e.g. the login request itself).
 *
 * @param req the outgoing request
 * @param next the next handler in the chain
 * @returns the response stream, for a request with the bearer header set if a token exists
 */
export const jwtInterceptor: HttpInterceptorFn = (req, next) => {
  const token = inject(AuthService).token();

  if (!token) {
    return next(req);
  }

  return next(
    req.clone({
      setHeaders: { Authorization: `Bearer ${token}` },
    }),
  );
};
