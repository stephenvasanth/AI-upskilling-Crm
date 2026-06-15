import { Routes } from '@angular/router';

import { adminGuard } from './core/guards/admin.guard';
import { authGuard } from './core/guards/auth.guard';
import { MainLayoutComponent } from './shared/layout/main-layout.component';

/**
 * Root route table. The `/login` route is public. Every other route is
 * rendered inside `MainLayoutComponent` behind `authGuard`. Feature routes
 * (contacts, deals, activities, tasks, users, tags) are added incrementally
 * as each feature is built (docs/implementation_plan_crm.md, Group 13).
 */
export const routes: Routes = [
  {
    path: 'login',
    loadComponent: () => import('./features/auth/login/login.component').then((m) => m.LoginComponent),
  },
  {
    path: '',
    component: MainLayoutComponent,
    canActivate: [authGuard],
    children: [
      {
        path: '',
        pathMatch: 'full',
        loadComponent: () => import('./features/dashboard/dashboard.component').then((m) => m.DashboardComponent),
      },
      {
        path: 'contacts',
        pathMatch: 'full',
        loadComponent: () =>
          import('./features/contacts/contact-list/contact-list.component').then((m) => m.ContactListComponent),
      },
      {
        path: 'contacts/new',
        loadComponent: () =>
          import('./features/contacts/contact-form/contact-form.component').then((m) => m.ContactFormComponent),
      },
      {
        path: 'contacts/:id',
        pathMatch: 'full',
        loadComponent: () =>
          import('./features/contacts/contact-detail/contact-detail.component').then(
            (m) => m.ContactDetailComponent,
          ),
      },
      {
        path: 'contacts/:id/edit',
        loadComponent: () =>
          import('./features/contacts/contact-form/contact-form.component').then((m) => m.ContactFormComponent),
      },
      {
        path: 'deals',
        pathMatch: 'full',
        loadComponent: () => import('./features/deals/deal-board/deal-board.component').then((m) => m.DealBoardComponent),
      },
      {
        path: 'activities',
        pathMatch: 'full',
        loadComponent: () =>
          import('./features/activities/activity-feed/activity-feed.component').then((m) => m.ActivityFeedComponent),
      },
      {
        path: 'tasks',
        pathMatch: 'full',
        loadComponent: () => import('./features/tasks/task-list/task-list.component').then((m) => m.TaskListComponent),
      },
      {
        path: 'users',
        pathMatch: 'full',
        canActivate: [adminGuard],
        loadComponent: () => import('./features/users/user-list/user-list.component').then((m) => m.UserListComponent),
      },
      {
        path: 'tags',
        pathMatch: 'full',
        canActivate: [adminGuard],
        loadComponent: () => import('./features/tags/tag-list/tag-list.component').then((m) => m.TagListComponent),
      },
      {
        path: 'profile',
        pathMatch: 'full',
        loadComponent: () =>
          import('./features/profile/profile-page/profile-page.component').then((m) => m.ProfilePageComponent),
      },
    ],
  },
  { path: '**', redirectTo: 'login' },
];
