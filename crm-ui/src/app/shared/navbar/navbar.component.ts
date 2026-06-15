import { Component, computed, inject } from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';

import { AuthService } from '../../core/services/auth.service';

/**
 * Persistent 240px left sidebar (docs/DESIGN.md §4): brand, primary
 * navigation (Dashboard/Contacts/Deals/Activities/Tasks), an ADMIN-only
 * section (Users/Tags), and the current user's avatar/name/role with a
 * logout button. Hosted by the authenticated layout (Group 13).
 */
@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, MatIconModule],
  templateUrl: './navbar.component.html',
  styleUrl: './navbar.component.scss',
})
export class NavbarComponent {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  /** The currently authenticated user, or `null` if not logged in. */
  readonly currentUser = this.authService.currentUser;

  /** `true` if the current user has the `ADMIN` role; shows the admin nav section. */
  readonly isAdmin = this.authService.isAdmin;

  /** Two-letter initials derived from the current user's name, for the avatar. */
  readonly initials = computed(() => {
    const user = this.currentUser();
    if (!user) {
      return '';
    }
    return `${user.firstName.charAt(0)}${user.lastName.charAt(0)}`.toUpperCase();
  });

  /**
   * Clears the session (`AuthService.logout()`) and navigates to `/login`.
   */
  logout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}
