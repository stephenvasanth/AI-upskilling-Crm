import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { catchError, forkJoin, of } from 'rxjs';

import { ActivityService } from '../../core/services/activity.service';
import { ContactService } from '../../core/services/contact.service';
import { DealService } from '../../core/services/deal.service';
import { ActivityResponse, ActivityType } from '../../core/models/activity.model';
import { ContactResponse } from '../../core/models/contact.model';
import { DealResponse } from '../../core/models/deal.model';

/** Input data for {@link ActivityFormDialogComponent}: the contact and/or deal to log the activity against. */
export interface ActivityFormDialogData {
  contactId?: number | null;
  dealId?: number | null;
}

/** Activity type options for the type selector, in display order (docs/DESIGN.md §5.5). */
const ACTIVITY_TYPES: { value: ActivityType; label: string; icon: string }[] = [
  { value: 'CALL', label: 'Call', icon: 'call' },
  { value: 'EMAIL', label: 'Email', icon: 'email' },
  { value: 'MEETING', label: 'Meeting', icon: 'groups' },
  { value: 'NOTE', label: 'Note', icon: 'sticky_note_2' },
];

/**
 * "Log Activity" drawer (docs/DESIGN.md §5.5, §8.1, requirement ACT-01): an
 * activity-type selector, subject, and notes, logged against the contact
 * and/or deal supplied via `MAT_DIALOG_DATA`.
 *
 * When opened without a `contactId`/`dealId` (e.g. from the global Activities
 * feed), Contact/Deal searchable pickers are shown so the user can choose
 * what to link the activity to; at least one of them must be selected
 * (enforced server-side by `ActivityService.createActivity`).
 *
 * Opened via `MatDialog.open(ActivityFormDialogComponent, { data, panelClass: 'drawer-panel' })`;
 * `afterClosed()` resolves to the created `ActivityResponse`, or `undefined` if cancelled.
 */
@Component({
  selector: 'app-activity-form-dialog',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatAutocompleteModule,
    MatButtonModule,
    MatButtonToggleModule,
    MatDialogModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatProgressSpinnerModule,
  ],
  templateUrl: './activity-form-dialog.component.html',
  styleUrl: './activity-form-dialog.component.scss',
})
export class ActivityFormDialogComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly activityService = inject(ActivityService);
  private readonly contactService = inject(ContactService);
  private readonly dealService = inject(DealService);
  private readonly dialogRef = inject(MatDialogRef<ActivityFormDialogComponent, ActivityResponse>);

  /** The contact/deal to log this activity against. */
  protected readonly data = inject<ActivityFormDialogData>(MAT_DIALOG_DATA);

  /** Activity type options for the type selector. */
  readonly activityTypes = ACTIVITY_TYPES;

  /**
   * `true` when no contact/deal was supplied via `data`, so the Contact/Deal
   * pickers must be shown to let the user choose what to log this against.
   */
  readonly showLinkPickers = this.data.contactId == null && this.data.dealId == null;

  /** Contacts available for the contact picker (only loaded when {@link showLinkPickers}). */
  readonly contacts = signal<ContactResponse[]>([]);

  /** Deals available for the deal picker (only loaded when {@link showLinkPickers}). */
  readonly deals = signal<DealResponse[]>([]);

  /** `true` while the activity is being saved. */
  readonly saving = signal(false);

  /** User-facing error message from the last failed load/save, or `null`. */
  readonly error = signal<string | null>(null);

  /** Activity form: type, subject, optional notes, and resolved contact/deal links. */
  readonly form = this.fb.group({
    type: this.fb.nonNullable.control<ActivityType>('NOTE', Validators.required),
    subject: this.fb.nonNullable.control('', Validators.required),
    body: this.fb.control<string | null>(null),
    contactId: this.fb.control<number | null>(this.data.contactId ?? null),
    dealId: this.fb.control<number | null>(this.data.dealId ?? null),
  });

  /** Free-text contact search box. Matched against `contacts` by name to resolve `contactId`. */
  readonly contactInput = this.fb.nonNullable.control('');

  /** Free-text deal search box. Matched against `deals` by title to resolve `dealId`. */
  readonly dealInput = this.fb.nonNullable.control('');

  private readonly contactSearchTerm = toSignal(this.contactInput.valueChanges, { initialValue: '' });
  private readonly dealSearchTerm = toSignal(this.dealInput.valueChanges, { initialValue: '' });

  /** Contacts whose name contains the current `contactInput` text (case-insensitive). */
  readonly filteredContacts = computed(() => {
    const term = this.contactSearchTerm().trim().toLowerCase();
    if (!term) {
      return this.contacts();
    }
    return this.contacts().filter((contact) => `${contact.firstName} ${contact.lastName}`.toLowerCase().includes(term));
  });

  /** Deals whose title contains the current `dealInput` text (case-insensitive). */
  readonly filteredDeals = computed(() => {
    const term = this.dealSearchTerm().trim().toLowerCase();
    if (!term) {
      return this.deals();
    }
    return this.deals().filter((deal) => deal.title.toLowerCase().includes(term));
  });

  /**
   * When {@link showLinkPickers} is set, loads the contacts and deals offered
   * by the Contact/Deal pickers, and keeps `form.contactId`/`form.dealId` in
   * sync with the free-text picker inputs.
   */
  ngOnInit(): void {
    if (!this.showLinkPickers) {
      return;
    }

    this.contactInput.valueChanges.subscribe((value) => {
      const match = this.contacts().find((contact) => `${contact.firstName} ${contact.lastName}` === value);
      this.form.controls.contactId.setValue(match?.id ?? null);
    });

    this.dealInput.valueChanges.subscribe((value) => {
      const match = this.deals().find((deal) => deal.title === value);
      this.form.controls.dealId.setValue(match?.id ?? null);
    });

    forkJoin({
      contacts: this.contactService.getContacts({ size: 100 }),
      pipeline: this.dealService.getPipeline(),
    })
      .pipe(
        catchError(() => {
          this.error.set('Something went wrong loading contacts and deals. Please try again.');
          return of(null);
        }),
      )
      .subscribe((result) => {
        if (!result) {
          return;
        }
        this.contacts.set(result.contacts.content);
        this.deals.set(result.pipeline.stages.flatMap((stage) => stage.deals));
      });
  }

  /**
   * Validates and submits the form: logs the activity against the resolved
   * contact/deal and closes the dialog with the created activity. When
   * {@link showLinkPickers} is set, at least one of the contact/deal pickers
   * must resolve to a value, mirroring the server-side requirement.
   */
  submit(): void {
    if (this.form.invalid || this.saving()) {
      this.form.markAllAsTouched();
      return;
    }

    const values = this.form.getRawValue();

    if (this.showLinkPickers && values.contactId == null && values.dealId == null) {
      this.error.set('Select a contact or a deal to log this activity against.');
      return;
    }

    this.saving.set(true);
    this.error.set(null);

    this.activityService
      .createActivity({
        type: values.type,
        subject: values.subject,
        body: values.body,
        contactId: values.contactId,
        dealId: values.dealId,
      })
      .pipe(
        catchError(() => {
          this.saving.set(false);
          this.error.set('Something went wrong logging this activity. Please try again.');
          return of(null);
        }),
      )
      .subscribe((activity) => {
        if (!activity) {
          return;
        }
        this.saving.set(false);
        this.dialogRef.close(activity);
      });
  }

  /** Closes the dialog without saving. */
  cancel(): void {
    this.dialogRef.close();
  }
}
