import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { catchError, of } from 'rxjs';

import { ActivityService } from '../../../core/services/activity.service';
import { ContactService } from '../../../core/services/contact.service';
import { ActivityResponse, ActivityType } from '../../../core/models/activity.model';
import { ContactResponse } from '../../../core/models/contact.model';
import { AvatarComponent } from '../../../shared/avatar/avatar.component';
import { ActivityFormDialogComponent } from '../../../shared/activity-form-dialog/activity-form-dialog.component';
import { ConfirmDialogComponent } from '../../../shared/confirm-dialog/confirm-dialog.component';

/** Icon and colour token for each activity type (docs/DESIGN.md §5.5, mirrors contact detail). */
const ACTIVITY_TYPE_META: Record<ActivityType, { icon: string; color: string }> = {
  CALL: { icon: 'call', color: 'var(--color-info)' },
  EMAIL: { icon: 'email', color: 'var(--color-primary)' },
  MEETING: { icon: 'groups', color: 'var(--color-success)' },
  NOTE: { icon: 'sticky_note_2', color: 'var(--color-text-secondary)' },
};

/** Activity type filter options, in display order (docs/DESIGN.md §5.5). */
const ACTIVITY_TYPE_OPTIONS: { value: ActivityType; label: string }[] = [
  { value: 'CALL', label: 'Call' },
  { value: 'EMAIL', label: 'Email' },
  { value: 'MEETING', label: 'Meeting' },
  { value: 'NOTE', label: 'Note' },
];

/** A person's first and last name, split from a combined "First Last" display name. */
interface NameParts {
  first: string;
  last: string;
}

/**
 * Splits a "First Last" display name (e.g. `ActivityResponse.createdByName`)
 * into first/last parts for {@link AvatarComponent}.
 *
 * @param fullName the combined display name
 */
function splitName(fullName: string): NameParts {
  const [first = '', last = ''] = fullName.split(' ');
  return { first, last };
}

/**
 * Global activity feed page (docs/DESIGN.md §5.5, requirements ACT-01 to
 * ACT-05): a paginated, filterable feed of every logged activity, with a
 * "Log Activity" drawer for logging a new one against any contact and/or
 * deal.
 *
 * The Type filter is applied client-side to the current page (the
 * `/api/activities` endpoint has no type parameter); the Contact filter sets
 * the `contactId` query parameter and reloads from the server. There is no
 * Edit action: `ActivityController` exposes no update endpoint.
 */
@Component({
  selector: 'app-activity-feed',
  standalone: true,
  imports: [
    DatePipe,
    RouterLink,
    ReactiveFormsModule,
    MatButtonModule,
    MatDialogModule,
    MatFormFieldModule,
    MatIconModule,
    MatPaginatorModule,
    MatProgressSpinnerModule,
    MatSelectModule,
    AvatarComponent,
  ],
  templateUrl: './activity-feed.component.html',
  styleUrl: './activity-feed.component.scss',
})
export class ActivityFeedComponent implements OnInit {
  private readonly activityService = inject(ActivityService);
  private readonly contactService = inject(ContactService);
  private readonly dialog = inject(MatDialog);

  /** Activity type filter options, in display order. */
  readonly activityTypeOptions = ACTIVITY_TYPE_OPTIONS;

  /** Contacts for the Contact filter, loaded once on init. */
  readonly contacts = signal<ContactResponse[]>([]);

  /** The current page of activities, before the client-side type filter. */
  readonly activities = signal<ActivityResponse[]>([]);

  /** `true` while a page of activities is loading. */
  readonly loading = signal(true);

  /** `true` if the most recent request failed. */
  readonly error = signal(false);

  /** Total number of activities matching the current contact filter, across all pages. */
  readonly totalElements = signal(0);

  /** Zero-based current page index. */
  readonly page = signal(0);

  /** Number of rows per page. */
  readonly pageSize = signal(20);

  /** Type filter, applied client-side. `null` means "All". */
  readonly typeFilter = new FormControl<ActivityType | null>(null);

  /** Contact filter, applied server-side via `contactId`. `null` means "All Contacts". */
  readonly contactFilter = new FormControl<number | null>(null);

  private readonly typeFilterValue = toSignal(this.typeFilter.valueChanges, { initialValue: null });

  /** The current page of activities, narrowed to `typeFilter` if set. */
  readonly filteredActivities = computed(() => {
    const type = this.typeFilterValue();
    const activities = this.activities();
    return type ? activities.filter((activity) => activity.type === type) : activities;
  });

  /**
   * Loads the first page of activities and the contacts for the Contact
   * filter, and reloads (from page 0) whenever the Contact filter changes.
   */
  ngOnInit(): void {
    this.loadActivities();

    this.contactService
      .getContacts({ size: 100, sort: 'lastName,asc' })
      .pipe(catchError(() => of(null)))
      .subscribe((result) => {
        if (result) {
          this.contacts.set(result.content);
        }
      });

    this.contactFilter.valueChanges.subscribe(() => {
      this.page.set(0);
      this.loadActivities();
    });
  }

  /** Fetches the current page of activities, filtered by `contactFilter`. */
  loadActivities(): void {
    this.loading.set(true);
    this.error.set(false);

    this.activityService
      .getActivities({
        contactId: this.contactFilter.value ?? undefined,
        page: this.page(),
        size: this.pageSize(),
      })
      .pipe(
        catchError(() => {
          this.error.set(true);
          return of(null);
        }),
      )
      .subscribe((result) => {
        this.loading.set(false);
        if (!result) {
          return;
        }
        this.activities.set(result.content);
        this.totalElements.set(result.totalElements);
      });
  }

  /**
   * Handles `mat-paginator`'s page change event by updating the page index
   * and size and reloading.
   *
   * @param event the new page index/size
   */
  onPageChange(event: PageEvent): void {
    this.page.set(event.pageIndex);
    this.pageSize.set(event.pageSize);
    this.loadActivities();
  }

  /** Opens the "Log Activity" drawer with no preselected contact/deal, reloading the feed on success. */
  logActivity(): void {
    this.dialog
      .open(ActivityFormDialogComponent, { data: {}, panelClass: 'drawer-panel' })
      .afterClosed()
      .subscribe((activity) => {
        if (activity) {
          this.loadActivities();
        }
      });
  }

  /**
   * Confirms and deletes an activity, then reloads the current page.
   *
   * @param activity the activity to delete
   */
  delete(activity: ActivityResponse): void {
    this.dialog
      .open(ConfirmDialogComponent, {
        data: {
          title: 'Delete this activity?',
          message: 'This will permanently delete the activity and cannot be undone.',
        },
      })
      .afterClosed()
      .subscribe((confirmed) => {
        if (confirmed) {
          this.activityService.deleteActivity(activity.id).subscribe(() => this.loadActivities());
        }
      });
  }

  /**
   * The Material icon name for an activity type.
   *
   * @param type the activity type
   */
  activityIcon(type: ActivityType): string {
    return ACTIVITY_TYPE_META[type].icon;
  }

  /**
   * The CSS colour token for an activity type's icon.
   *
   * @param type the activity type
   */
  activityColor(type: ActivityType): string {
    return ACTIVITY_TYPE_META[type].color;
  }

  /** Splits an activity's author display name into first/last parts for the author avatar. */
  author(activity: ActivityResponse): NameParts {
    return splitName(activity.createdByName);
  }

  /**
   * `true` if `iso` falls on today's date (local time), for the "Today at
   * ..." vs "Jun 9" date formatting (docs/DESIGN.md §5.5).
   *
   * @param iso the ISO-8601 timestamp to check
   */
  isToday(iso: string): boolean {
    return new Date(iso).toDateString() === new Date().toDateString();
  }
}
