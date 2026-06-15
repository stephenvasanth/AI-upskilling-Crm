import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CurrencyPipe, DatePipe } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { catchError, forkJoin, of } from 'rxjs';

import { ActivityService } from '../../../core/services/activity.service';
import { ContactService } from '../../../core/services/contact.service';
import { DealService } from '../../../core/services/deal.service';
import { ActivityResponse, ActivityType } from '../../../core/models/activity.model';
import { ContactResponse, ContactUpdateRequest } from '../../../core/models/contact.model';
import { DealResponse, DealStage } from '../../../core/models/deal.model';
import { AvatarComponent } from '../../../shared/avatar/avatar.component';
import { TagChipComponent } from '../../../shared/tag-chip/tag-chip.component';
import { ConfirmDialogComponent } from '../../../shared/confirm-dialog/confirm-dialog.component';
import { ActivityFormDialogComponent } from '../../../shared/activity-form-dialog/activity-form-dialog.component';
import { TaskFormDialogComponent } from '../../../shared/task-form-dialog/task-form-dialog.component';

/** Human-readable label for each deal stage (docs/DESIGN.md §5.4). */
const STAGE_LABELS: Record<DealStage, string> = {
  LEAD: 'Lead',
  QUALIFIED: 'Qualified',
  PROPOSAL: 'Proposal',
  NEGOTIATION: 'Negotiation',
  CLOSED_WON: 'Closed Won',
  CLOSED_LOST: 'Closed Lost',
};

/** Accent colour for each deal stage's badge (docs/DESIGN.md §5.4). */
const STAGE_COLORS: Record<DealStage, string> = {
  LEAD: '#94A3B8',
  QUALIFIED: '#3B82F6',
  PROPOSAL: '#8B5CF6',
  NEGOTIATION: '#F59E0B',
  CLOSED_WON: '#10B981',
  CLOSED_LOST: '#EF4444',
};

/** Icon and colour token for each activity type (docs/DESIGN.md §5.3.2, mirrors dashboard). */
const ACTIVITY_TYPE_META: Record<ActivityType, { icon: string; color: string }> = {
  CALL: { icon: 'call', color: 'var(--color-info)' },
  EMAIL: { icon: 'email', color: 'var(--color-primary)' },
  MEETING: { icon: 'groups', color: 'var(--color-success)' },
  NOTE: { icon: 'sticky_note_2', color: 'var(--color-text-secondary)' },
};

/** A person's first and last name, split from a combined "First Last" display name. */
interface NameParts {
  first: string;
  last: string;
}

/**
 * Splits a "First Last" display name (e.g. `ContactResponse.ownerName`) into
 * first/last parts for {@link AvatarComponent}.
 *
 * @param fullName the combined display name
 */
function splitName(fullName: string): NameParts {
  const [first = '', last = ''] = fullName.split(' ');
  return { first, last };
}

/**
 * Contact detail page (docs/DESIGN.md §5.3.2, requirements CON-04 to CON-09):
 * a two-column layout with the contact's profile, action bar, info grid, and
 * linked deals on the left, and a chronological activity feed on the right.
 * The name and job title support click-to-edit inline editing
 * (docs/DESIGN.md §8.3); all other fields are edited via the full contact
 * form.
 */
@Component({
  selector: 'app-contact-detail',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    CurrencyPipe,
    DatePipe,
    MatButtonModule,
    MatDialogModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatProgressSpinnerModule,
    AvatarComponent,
    TagChipComponent,
  ],
  templateUrl: './contact-detail.component.html',
  styleUrl: './contact-detail.component.scss',
})
export class ContactDetailComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly fb = inject(FormBuilder);
  private readonly dialog = inject(MatDialog);
  private readonly contactService = inject(ContactService);
  private readonly dealService = inject(DealService);
  private readonly activityService = inject(ActivityService);

  /** The contact id, from the `/contacts/:id` route. */
  private readonly contactId = Number(this.route.snapshot.paramMap.get('id'));

  /** The loaded contact, or `null` while loading/on error. */
  readonly contact = signal<ContactResponse | null>(null);

  /** Deals linked to this contact, from the pipeline. */
  readonly linkedDeals = signal<DealResponse[]>([]);

  /** This contact's activity feed, most recent first. */
  readonly activities = signal<ActivityResponse[]>([]);

  /** `true` while the contact, linked deals, and activity feed are loading. */
  readonly loading = signal(true);

  /** `true` if the initial load failed. */
  readonly error = signal(false);

  /** `true` while the name is being edited inline (docs/DESIGN.md §8.3). */
  readonly editingName = signal(false);

  /** `true` while the job title is being edited inline (docs/DESIGN.md §8.3). */
  readonly editingTitle = signal(false);

  /** `true` while an inline edit is being saved. */
  readonly savingInline = signal(false);

  /** Inline edit form for the contact's first/last name. */
  readonly nameForm = this.fb.nonNullable.group({
    firstName: this.fb.nonNullable.control('', Validators.required),
    lastName: this.fb.nonNullable.control('', Validators.required),
  });

  /** Inline edit control for the contact's job title. */
  readonly titleControl = this.fb.control<string | null>(null);

  /** The contact owner's name, split for {@link AvatarComponent}. */
  readonly owner = computed<NameParts>(() => {
    const contact = this.contact();
    return contact ? splitName(contact.ownerName) : { first: '', last: '' };
  });

  /** Loads the contact, its linked deals, and its activity feed on init. */
  ngOnInit(): void {
    this.load();
  }

  /**
   * Fetches the contact, the full pipeline (to derive linked deals), and the
   * contact's activity feed in parallel.
   */
  load(): void {
    this.loading.set(true);
    this.error.set(false);

    forkJoin({
      contact: this.contactService.getContact(this.contactId),
      pipeline: this.dealService.getPipeline(),
      activities: this.activityService.getActivities({ contactId: this.contactId, size: 50 }),
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
        this.contact.set(result.contact);
        this.linkedDeals.set(
          result.pipeline.stages.flatMap((stage) => stage.deals).filter((deal) => deal.contactId === this.contactId),
        );
        this.activities.set(result.activities.content);
      });
  }

  /** Opens inline editing for the contact's name, pre-filled with the current values. */
  startEditName(): void {
    const contact = this.contact();
    if (!contact) {
      return;
    }
    this.nameForm.setValue({ firstName: contact.firstName, lastName: contact.lastName });
    this.editingName.set(true);
  }

  /** Validates and saves the inline name edit. */
  saveName(): void {
    if (this.nameForm.invalid || this.savingInline()) {
      this.nameForm.markAllAsTouched();
      return;
    }
    this.updateContact(this.nameForm.getRawValue(), () => this.editingName.set(false));
  }

  /** Cancels the inline name edit without saving. */
  cancelEditName(): void {
    this.editingName.set(false);
  }

  /** Opens inline editing for the contact's job title, pre-filled with the current value. */
  startEditTitle(): void {
    const contact = this.contact();
    if (!contact) {
      return;
    }
    this.titleControl.setValue(contact.title);
    this.editingTitle.set(true);
  }

  /** Saves the inline job title edit. */
  saveTitle(): void {
    if (this.savingInline()) {
      return;
    }
    this.updateContact({ title: this.titleControl.value }, () => this.editingTitle.set(false));
  }

  /** Cancels the inline job title edit without saving. */
  cancelEditTitle(): void {
    this.editingTitle.set(false);
  }

  /**
   * Saves an inline edit by sending the full contact (current values plus
   * `changes`) via `PUT /api/contacts/{id}`, since `ContactUpdateRequest` is a
   * full replacement of the contact's editable fields.
   *
   * @param changes the fields being changed
   * @param onSuccess called once the update succeeds
   */
  private updateContact(changes: Partial<ContactUpdateRequest>, onSuccess: () => void): void {
    const contact = this.contact();
    if (!contact) {
      return;
    }

    this.savingInline.set(true);

    const request: ContactUpdateRequest = {
      firstName: contact.firstName,
      lastName: contact.lastName,
      email: contact.email,
      phone: contact.phone,
      title: contact.title,
      companyId: contact.companyId,
      ownerId: contact.ownerId,
      tagIds: contact.tags.map((tag) => tag.id),
      ...changes,
    };

    this.contactService.updateContact(contact.id, request).subscribe((updated) => {
      this.savingInline.set(false);
      this.contact.set(updated);
      onSuccess();
    });
  }

  /** Navigates to the full contact edit form. */
  edit(): void {
    this.router.navigate(['/contacts', this.contactId, 'edit']);
  }

  /** Confirms and deletes this contact, then navigates back to the contact list. */
  delete(): void {
    const contact = this.contact();
    if (!contact) {
      return;
    }

    this.dialog
      .open(ConfirmDialogComponent, {
        data: {
          title: `Delete ${contact.firstName} ${contact.lastName}?`,
          message: 'This will permanently delete the contact and cannot be undone.',
        },
      })
      .afterClosed()
      .subscribe((confirmed) => {
        if (confirmed) {
          this.contactService.deleteContact(this.contactId).subscribe(() => this.router.navigate(['/contacts']));
        }
      });
  }

  /** Opens the "Log Activity" drawer for this contact, prepending the result to the activity feed. */
  logActivity(): void {
    this.dialog
      .open(ActivityFormDialogComponent, {
        data: { contactId: this.contactId },
        panelClass: 'drawer-panel',
      })
      .afterClosed()
      .subscribe((activity) => {
        if (activity) {
          this.activities.update((activities) => [activity, ...activities]);
        }
      });
  }

  /** Opens the "Add Task" drawer for this contact. */
  addTask(): void {
    this.dialog.open(TaskFormDialogComponent, {
      data: { contactId: this.contactId },
      panelClass: 'drawer-panel',
    });
  }

  /**
   * The display label for a pipeline stage (e.g. `CLOSED_WON` → `"Closed Won"`).
   *
   * @param stage the deal stage
   */
  stageLabel(stage: DealStage): string {
    return STAGE_LABELS[stage];
  }

  /**
   * The accent colour for a pipeline stage's badge.
   *
   * @param stage the deal stage
   */
  stageColor(stage: DealStage): string {
    return STAGE_COLORS[stage];
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
}
