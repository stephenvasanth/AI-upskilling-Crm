import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

import { AuthService } from '../../../core/services/auth.service';

/**
 * Login page (docs/DESIGN.md §5.1, requirement AUTH-01): a centred card with
 * email/password fields. On success, redirects to the dashboard (`/`). On
 * failure, shows an inline error message and a shake animation on the card.
 */
@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatButtonModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatProgressSpinnerModule,
  ],
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss',
})
export class LoginComponent {
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  /** Email/password reactive form. */
  readonly form = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', Validators.required],
  });

  /** `true` while the login request is in flight; disables the form. */
  readonly loading = signal(false);

  /** User-facing error message from the last failed login attempt, or `null`. */
  readonly error = signal<string | null>(null);

  /** `true` while the password field is masked. */
  readonly hidePassword = signal(true);

  /**
   * Submits the email/password to `AuthService.login`. On success, redirects
   * to `/`. On failure, sets `error` to a user-facing message (invalid
   * credentials for a 401, generic otherwise) and re-enables the form.
   */
  submit(): void {
    if (this.form.invalid || this.loading()) {
      return;
    }

    this.loading.set(true);
    this.error.set(null);

    this.authService.login(this.form.getRawValue()).subscribe({
      next: () => {
        this.loading.set(false);
        this.router.navigate(['/']);
      },
      error: (err: HttpErrorResponse) => {
        this.loading.set(false);
        this.error.set(err.status === 401 ? 'Invalid email or password' : 'Something went wrong. Please try again.');
      },
    });
  }

  /** Toggles the password field between masked and plain text. */
  togglePasswordVisibility(): void {
    this.hidePassword.set(!this.hidePassword());
  }
}
