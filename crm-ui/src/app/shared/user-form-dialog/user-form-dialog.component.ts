import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { catchError, of } from 'rxjs';

import { UserService } from '../../core/services/user.service';
import { UserResponse, UserRole } from '../../core/models/user.model';

/** Input data for {@link UserFormDialogComponent}: the user to edit, or `{}` to invite a new user. */
export interface UserFormDialogData {
  user?: UserResponse | null;
}

/**
 * "Invite User" / "Edit User" drawer (docs/DESIGN.md §5.7, requirements
 * AUTH-04 to AUTH-06): name, email, password, role, and (when editing)
 * active status.
 *
 * In create mode (`data.user` absent), email and password are required and
 * submits to `POST /api/auth/register`. In edit mode (`data.user` set), the
 * email field is read-only, the password is optional ("leave blank to keep
 * current"), and an Active toggle is shown; submits to `PUT /api/users/{id}`.
 *
 * Opened via `MatDialog.open(UserFormDialogComponent, { data, panelClass: 'drawer-panel' })`;
 * `afterClosed()` resolves to the created/updated `UserResponse`, or
 * `undefined` if cancelled.
 */
@Component({
  selector: 'app-user-form-dialog',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatButtonModule,
    MatCheckboxModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatProgressSpinnerModule,
    MatSelectModule,
  ],
  templateUrl: './user-form-dialog.component.html',
  styleUrl: './user-form-dialog.component.scss',
})
export class UserFormDialogComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly dialogRef = inject(MatDialogRef<UserFormDialogComponent, UserResponse | undefined>);
  private readonly userService = inject(UserService);

  /** The user being edited, or `{}` when inviting a new user. */
  protected readonly data = inject<UserFormDialogData>(MAT_DIALOG_DATA);

  /** `true` when editing an existing user; `false` when inviting a new one. */
  readonly isEditMode = computed(() => this.data.user != null);

  /** `true` while the user is being saved. */
  readonly saving = signal(false);

  /** User-facing error message from the last failed save, or `null`. */
  readonly error = signal<string | null>(null);

  /** User form: name, email, password, role, and active status. */
  readonly form = this.fb.group({
    firstName: this.fb.nonNullable.control('', Validators.required),
    lastName: this.fb.nonNullable.control('', Validators.required),
    email: this.fb.nonNullable.control('', [Validators.required, Validators.email]),
    password: this.fb.control<string | null>(null),
    role: this.fb.nonNullable.control<UserRole>('USER', Validators.required),
    active: this.fb.nonNullable.control(true),
  });

  /**
   * In edit mode, disables the email field (not editable via `PUT
   * /api/users/{id}`), relaxes the password validator to optional, and
   * populates the form from `data.user`. In create mode, requires a password
   * of at least 8 characters.
   */
  ngOnInit(): void {
    if (this.isEditMode()) {
      const user = this.data.user as UserResponse;
      this.form.setValue({
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        password: null,
        role: user.role,
        active: user.active,
      });
      this.form.controls.email.disable();
      this.form.controls.password.setValidators(Validators.minLength(8));
    } else {
      this.form.controls.password.setValidators([Validators.required, Validators.minLength(8)]);
    }
    this.form.controls.password.updateValueAndValidity();
  }

  /**
   * Validates and submits the form: invites a new user
   * (`POST /api/auth/register`) or updates the existing one
   * (`PUT /api/users/{id}`), then closes the dialog with the result.
   */
  submit(): void {
    if (this.form.invalid || this.saving()) {
      this.form.markAllAsTouched();
      return;
    }

    this.saving.set(true);
    this.error.set(null);

    const values = this.form.getRawValue();
    const user = this.data.user;

    const save$ = user
      ? this.userService.updateUser(user.id, {
          firstName: values.firstName,
          lastName: values.lastName,
          password: values.password || null,
          role: values.role,
          active: values.active,
        })
      : this.userService.registerUser({
          firstName: values.firstName,
          lastName: values.lastName,
          email: values.email,
          password: values.password as string,
          role: values.role,
        });

    save$
      .pipe(
        catchError((err: HttpErrorResponse) => {
          this.saving.set(false);
          this.error.set(
            err.status === 409 ? 'A user with this email already exists.' : 'Something went wrong saving this user. Please try again.',
          );
          return of(null);
        }),
      )
      .subscribe((saved) => {
        if (!saved) {
          return;
        }
        this.saving.set(false);
        this.dialogRef.close(saved);
      });
  }

  /** Closes the dialog without saving. */
  cancel(): void {
    this.dialogRef.close();
  }
}
