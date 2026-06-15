import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialog, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { catchError, forkJoin, of } from 'rxjs';

import { AuthService } from '../../core/services/auth.service';
import { ContactService } from '../../core/services/contact.service';
import { DealService } from '../../core/services/deal.service';
import { UserService } from '../../core/services/user.service';
import { ContactResponse } from '../../core/models/contact.model';
import { DealCreateRequest, DealResponse, DealStage } from '../../core/models/deal.model';
import { UserResponse } from '../../core/models/user.model';
import { ConfirmDialogComponent } from '../confirm-dialog/confirm-dialog.component';

/** Input data for {@link DealFormDialogComponent}: the deal to edit, or `null`/absent to create a new one. */
export interface DealFormDialogData {
  deal?: DealResponse | null;
}

/**
 * Result of {@link DealFormDialogComponent}: the created/updated deal,
 * `'deleted'` if the deal was deleted, or `undefined` if cancelled.
 */
export type DealFormDialogResult = DealResponse | 'deleted' | undefined;

/** Pipeline stages in display order, with their human-readable labels (docs/DESIGN.md §5.4). */
const STAGE_OPTIONS: { value: DealStage; label: string }[] = [
  { value: 'LEAD', label: 'Lead' },
  { value: 'QUALIFIED', label: 'Qualified' },
  { value: 'PROPOSAL', label: 'Proposal' },
  { value: 'NEGOTIATION', label: 'Negotiation' },
  { value: 'CLOSED_WON', label: 'Closed Won' },
  { value: 'CLOSED_LOST', label: 'Closed Lost' },
];

/**
 * Deal create/edit drawer (docs/DESIGN.md §5.4, requirements DEA-01, DEA-06,
 * DEA-08): title, value, stage, close date, linked contact, and owner.
 *
 * Opened via `MatDialog.open(DealFormDialogComponent, { data, panelClass: 'drawer-panel' })`;
 * `afterClosed()` resolves to the created/updated `DealResponse`, `'deleted'`
 * if the deal was deleted, or `undefined` if cancelled.
 */
@Component({
  selector: 'app-deal-form-dialog',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatAutocompleteModule,
    MatButtonModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatProgressSpinnerModule,
    MatSelectModule,
  ],
  templateUrl: './deal-form-dialog.component.html',
  styleUrl: './deal-form-dialog.component.scss',
})
export class DealFormDialogComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly dialog = inject(MatDialog);
  private readonly dialogRef = inject(MatDialogRef<DealFormDialogComponent, DealFormDialogResult>);
  private readonly authService = inject(AuthService);
  private readonly dealService = inject(DealService);
  private readonly contactService = inject(ContactService);
  private readonly userService = inject(UserService);

  /** The deal being edited, or `null`/absent when creating a new deal. */
  protected readonly data = inject<DealFormDialogData>(MAT_DIALOG_DATA);

  /** Pipeline stage options, in display order. */
  readonly stageOptions = STAGE_OPTIONS;

  /** All contacts, for the contact autocomplete. */
  readonly contacts = signal<ContactResponse[]>([]);

  /** All users, for the owner select. */
  readonly users = signal<UserResponse[]>([]);

  /** `true` while reference data is loading. */
  readonly loading = signal(true);

  /** `true` while the deal is being saved. */
  readonly saving = signal(false);

  /** User-facing error message from the last failed load/save, or `null`. */
  readonly error = signal<string | null>(null);

  /** `true` when editing an existing deal; `false` when creating a new one. */
  readonly isEditMode = computed(() => this.data.deal != null);

  /** Free-text contact search box. Matched against `contacts` by name to resolve `contactId`. */
  readonly contactInput = this.fb.nonNullable.control('');

  private readonly contactSearchTerm = toSignal(this.contactInput.valueChanges, { initialValue: '' });

  /** Contacts whose name contains the current `contactInput` text (case-insensitive). */
  readonly filteredContacts = computed(() => {
    const term = this.contactSearchTerm().trim().toLowerCase();
    if (!term) {
      return this.contacts();
    }
    return this.contacts().filter((contact) =>
      `${contact.firstName} ${contact.lastName}`.toLowerCase().includes(term),
    );
  });

  /** Deal form. */
  readonly form = this.fb.group({
    title: this.fb.nonNullable.control('', Validators.required),
    value: this.fb.nonNullable.control(0, Validators.min(0)),
    stage: this.fb.nonNullable.control<DealStage>('LEAD', Validators.required),
    closeDate: this.fb.control<string | null>(null),
    contactId: this.fb.control<number | null>(null),
    ownerId: this.fb.control<number | null>(null, Validators.required),
  });

  /**
   * Loads reference data (contacts and users) and, in edit mode, populates
   * the form with the deal being edited; in create mode, defaults the owner
   * to the current user.
   */
  ngOnInit(): void {
    // Keep `contactId` in sync with the free-text contact input: resolve it
    // to a known contact by name, or clear it if the text no longer matches one.
    this.contactInput.valueChanges.subscribe((value) => {
      const match = this.contacts().find((contact) => `${contact.firstName} ${contact.lastName}` === value);
      this.form.controls.contactId.setValue(match?.id ?? null);
    });

    forkJoin({
      contacts: this.contactService.getContacts({ size: 100 }),
      users: this.userService.getUsers(),
    })
      .pipe(
        catchError(() => {
          this.error.set('Something went wrong loading this form. Please try again.');
          return of(null);
        }),
      )
      .subscribe((result) => {
        this.loading.set(false);
        if (!result) {
          return;
        }
        this.contacts.set(result.contacts.content);
        this.users.set(result.users);

        const deal = this.data.deal;
        if (deal) {
          this.form.setValue({
            title: deal.title,
            value: deal.value,
            stage: deal.stage,
            closeDate: deal.closeDate,
            contactId: deal.contactId,
            ownerId: deal.ownerId,
          });
          this.contactInput.setValue(deal.contactName ?? '');
        } else {
          this.form.controls.ownerId.setValue(this.authService.currentUser()?.id ?? null);
        }
      });
  }

  /**
   * Validates and submits the form: creates a new deal or updates the
   * existing one, then closes the dialog with the result.
   */
  submit(): void {
    if (this.form.invalid || this.saving()) {
      this.form.markAllAsTouched();
      return;
    }

    this.saving.set(true);
    this.error.set(null);

    const values = this.form.getRawValue();
    const request: DealCreateRequest = {
      title: values.title,
      value: values.value,
      stage: values.stage,
      closeDate: values.closeDate,
      contactId: values.contactId,
      ownerId: values.ownerId as number,
    };

    const deal = this.data.deal;
    const save$ = deal ? this.dealService.updateDeal(deal.id, request) : this.dealService.createDeal(request);

    save$
      .pipe(
        catchError(() => {
          this.saving.set(false);
          this.error.set('Something went wrong saving this deal. Please try again.');
          return of(null);
        }),
      )
      .subscribe((updated) => {
        if (!updated) {
          return;
        }
        this.saving.set(false);
        this.dialogRef.close(updated);
      });
  }

  /** Confirms and deletes this deal, then closes the dialog with `'deleted'`. */
  delete(): void {
    const deal = this.data.deal;
    if (!deal) {
      return;
    }

    this.dialog
      .open(ConfirmDialogComponent, {
        data: {
          title: `Delete "${deal.title}"?`,
          message: 'This will permanently delete the deal and cannot be undone.',
        },
      })
      .afterClosed()
      .subscribe((confirmed) => {
        if (confirmed) {
          this.dealService.deleteDeal(deal.id).subscribe(() => this.dialogRef.close('deleted'));
        }
      });
  }

  /** Closes the dialog without saving. */
  cancel(): void {
    this.dialogRef.close();
  }
}
