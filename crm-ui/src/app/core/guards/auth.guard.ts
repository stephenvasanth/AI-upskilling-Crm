import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

import { AuthService } from '../services/auth.service';

/**
 * Protects every route except `/login` (crm-ui rules.md §6). Redirects to
 * `/login` when no session token is present.
 *
 * @returns `true` if a session token is present, otherwise a redirect to `/login`
 */
export const authGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (authService.isAuthenticated()) {
    return true;
  }

  return router.createUrlTree(['/login']);
};
