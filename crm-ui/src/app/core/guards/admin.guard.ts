import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

import { AuthService } from '../services/auth.service';

/**
 * Protects `/users` and any other admin-only routes (crm-ui rules.md §6).
 * Redirects non-admins to `/contacts`. Assumes `authGuard` has already
 * verified the user is logged in.
 *
 * @returns `true` if the current user has the `ADMIN` role, otherwise a redirect to `/contacts`
 */
export const adminGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (authService.isAdmin()) {
    return true;
  }

  return router.createUrlTree(['/contacts']);
};
