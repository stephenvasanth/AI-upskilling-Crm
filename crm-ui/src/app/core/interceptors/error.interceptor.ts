import { inject } from '@angular/core';
import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';

import { AuthService } from '../services/auth.service';

const SNACKBAR_DURATION_MS = 5000;

/**
 * Global HTTP error handling (crm-ui rules.md §9):
 * - `401` clears the session and redirects to `/login` — except for the
 *   login request itself, where a 401 means "invalid credentials" and must
 *   be left for the login form to display inline.
 * - `403` shows a "not authorised" snackbar and leaves the user on the page.
 * - `404` is passed through untouched — reads treat it as an empty state.
 * - `5xx`/network errors (status `0`) show a generic snackbar.
 *
 * In every case the original error is re-thrown so the calling feature
 * service/component can update its own `error`/`loading` signals.
 *
 * @param req the outgoing request
 * @param next the next handler in the chain
 * @returns the response stream, with the side effects above applied to errors
 */
export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const router = inject(Router);
  const snackBar = inject(MatSnackBar);

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      switch (error.status) {
        case 401:
          if (!req.url.endsWith('/auth/login')) {
            authService.logout();
            router.navigate(['/login']);
          }
          break;
        case 403:
          snackBar.open('You are not authorised to do that.', 'Dismiss', {
            duration: SNACKBAR_DURATION_MS,
          });
          break;
        case 404:
          break;
        default:
          snackBar.open('Something went wrong. Please try again.', 'Dismiss', {
            duration: SNACKBAR_DURATION_MS,
          });
          break;
      }
      return throwError(() => error);
    }),
  );
};
