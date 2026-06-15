import { Component, OnInit, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { catchError, of } from 'rxjs';

import { UserService } from '../../../core/services/user.service';
import { UserResponse } from '../../../core/models/user.model';
import { AvatarComponent } from '../../../shared/avatar/avatar.component';
import { ConfirmDialogComponent } from '../../../shared/confirm-dialog/confirm-dialog.component';
import { UserFormDialogComponent } from '../../../shared/user-form-dialog/user-form-dialog.component';

/**
 * Team members page (docs/DESIGN.md §5.7, requirements AUTH-04 to AUTH-06,
 * ADMIN only): a table of every user with avatar, name, email, role badge,
 * active status, and joined date, plus "Invite User" and per-row Edit/Activate
 * actions.
 */
@Component({
  selector: 'app-user-list',
  standalone: true,
  imports: [DatePipe, AvatarComponent, MatButtonModule, MatIconModule, MatMenuModule, MatProgressSpinnerModule],
  templateUrl: './user-list.component.html',
  styleUrl: './user-list.component.scss',
})
export class UserListComponent implements OnInit {
  private readonly dialog = inject(MatDialog);
  private readonly userService = inject(UserService);

  /** All users, ordered by name. */
  readonly users = signal<UserResponse[]>([]);

  /** `true` while the user list is loading. */
  readonly loading = signal(true);

  /** `true` if the last load failed. */
  readonly error = signal(false);

  /** Loads the team members list on init. */
  ngOnInit(): void {
    this.loadUsers();
  }

  /** Loads all users (`GET /api/users`). */
  loadUsers(): void {
    this.loading.set(true);
    this.error.set(false);

    this.userService
      .getUsers()
      .pipe(
        catchError(() => {
          this.error.set(true);
          return of(null);
        }),
      )
      .subscribe((users) => {
        this.loading.set(false);
        if (users) {
          this.users.set(users);
        }
      });
  }

  /** Opens the "Invite User" drawer and reloads the list on success. */
  inviteUser(): void {
    this.dialog
      .open(UserFormDialogComponent, { data: {}, panelClass: 'drawer-panel' })
      .afterClosed()
      .subscribe((result) => {
        if (result) {
          this.loadUsers();
        }
      });
  }

  /** Opens the "Edit User" drawer for the given user and reloads the list on success. */
  editUser(user: UserResponse): void {
    this.dialog
      .open(UserFormDialogComponent, { data: { user }, panelClass: 'drawer-panel' })
      .afterClosed()
      .subscribe((result) => {
        if (result) {
          this.loadUsers();
        }
      });
  }

  /**
   * Confirms, then activates or deactivates a user (`PUT /api/users/{id}`
   * with `active` flipped), and reloads the list.
   *
   * @param user the user to activate/deactivate
   */
  toggleActive(user: UserResponse): void {
    const action = user.active ? 'Deactivate' : 'Activate';

    this.dialog
      .open(ConfirmDialogComponent, {
        data: {
          title: `${action} ${user.firstName} ${user.lastName}?`,
          message: user.active
            ? 'This user will no longer be able to log in.'
            : 'This user will regain access to the CRM.',
          confirmLabel: action,
        },
      })
      .afterClosed()
      .subscribe((confirmed) => {
        if (!confirmed) {
          return;
        }
        this.userService
          .updateUser(user.id, {
            firstName: user.firstName,
            lastName: user.lastName,
            password: null,
            role: user.role,
            active: !user.active,
          })
          .subscribe(() => this.loadUsers());
      });
  }
}
