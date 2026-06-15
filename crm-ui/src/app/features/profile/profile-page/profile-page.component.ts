import { Component, OnInit, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { AbstractControl, FormBuilder, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { catchError, of } from 'rxjs';

import { AuthService } from '../../../core/services/auth.service';
import { UserService } from '../../../core/services/user.service';
import { UserResponse } from '../../../core/models/user.model';
import { AvatarComponent } from '../../../shared/avatar/avatar.component';

/**
 * Cross-field validator: when a new password is entered, requires
 * `confirmPassword` to match it. No-op while `password` is blank.
 *
 * @param group the form group containing `password` and `confirmPassword`
 */
function passwordsMatchValidator(group: AbstractControl): ValidationErrors | null {
  const password = group.get('password')?.value;
  const confirmPassword = group.get('confirmPassword')?.value;
  if (password && password !== confirmPassword) {
    return { passwordMismatch: true };
  }
  return null;
}

/**
 * Current user's profile page (docs/DESIGN.md §7, requirement AUTH-07): a
 * centred card showing the user's avatar, name, role, email, and join date,
 * with a form to update their name and, optionally, password.
 */
@Component({
  selector: 'app-profile-page',
  standalone: true,
  imports: [
    DatePipe,
    ReactiveFormsModule,
    AvatarComponent,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatProgressSpinnerModule,
  ],
  templateUrl: './profile-page.component.html',
  styleUrl: './profile-page.component.scss',
})
export class ProfilePageComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly userService = inject(UserService);

  /** The current user's profile, or `null` while loading or on error. */
  readonly profile = signal<UserResponse | null>(null);

  /** `true` while the profile is loading. */
  readonly loading = signal(true);

  /** `true` while the form is being submitted. */
  readonly saving = signal(false);

  /** User-facing error message from the last failed load/save, or `null`. */
  readonly error = signal<string | null>(null);

  /** `true` immediately after a successful save; cleared on the next edit. */
  readonly success = signal(false);

  /** Profile form: name and an optional new password (with confirmation). */
  readonly form = this.fb.group(
    {
      firstName: this.fb.nonNullable.control('', Validators.required),
      lastName: this.fb.nonNullable.control('', Validators.required),
      password: this.fb.control<string | null>(null, Validators.minLength(8)),
      confirmPassword: this.fb.control<string | null>(null),
    },
    { validators: passwordsMatchValidator },
  );

  /** Loads the current user's profile (`GET /api/users/me`) and populates the form. */
  ngOnInit(): void {
    this.userService
      .getOwnProfile()
      .pipe(
        catchError(() => {
          this.error.set('Something went wrong loading your profile. Please try again.');
          return of(null);
        }),
      )
      .subscribe((profile) => {
        this.loading.set(false);
        if (!profile) {
          return;
        }
        this.profile.set(profile);
        this.form.patchValue({ firstName: profile.firstName, lastName: profile.lastName });
      });
  }

  /**
   * Validates and submits the form (`PUT /api/users/me`), updates the cached
   * session profile, and clears the password fields on success.
   */
  submit(): void {
    if (this.form.invalid || this.saving()) {
      this.form.markAllAsTouched();
      return;
    }

    this.saving.set(true);
    this.error.set(null);
    this.success.set(false);

    const values = this.form.getRawValue();

    this.userService
      .updateOwnProfile({
        firstName: values.firstName,
        lastName: values.lastName,
        password: values.password || null,
      })
      .pipe(
        catchError(() => {
          this.saving.set(false);
          this.error.set('Something went wrong saving your profile. Please try again.');
          return of(null);
        }),
      )
      .subscribe((updated) => {
        if (!updated) {
          return;
        }
        this.saving.set(false);
        this.success.set(true);
        this.profile.set(updated);
        this.authService.setCurrentUser(updated);
        this.form.patchValue({ password: null, confirmPassword: null });
        this.form.markAsPristine();
      });
  }
}
