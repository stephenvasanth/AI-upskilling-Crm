import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';

import { NavbarComponent } from '../navbar/navbar.component';

/**
 * Authenticated app shell (docs/DESIGN.md §4): the persistent left sidebar
 * (`NavbarComponent`) plus a flexible main content area that hosts the
 * routed feature page. Applied as the component for the top-level
 * `authGuard`-protected route in `app.routes.ts`.
 */
@Component({
  selector: 'app-main-layout',
  standalone: true,
  imports: [RouterOutlet, NavbarComponent],
  templateUrl: './main-layout.component.html',
  styleUrl: './main-layout.component.scss',
})
export class MainLayoutComponent {}
