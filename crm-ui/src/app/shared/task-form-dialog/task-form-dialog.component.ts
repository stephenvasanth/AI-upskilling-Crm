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
import { TaskService } from '../../core/services/task.service';
import { UserService } from '../../core/services/user.service';
import { ContactResponse } from '../../core/models/contact.model';
import { DealResponse } from '../../core/models/deal.model';
import { TaskCreateRequest, TaskResponse } from '../../core/models/task.model';
import { UserResponse } from '../../core/models/user.model';
import { ConfirmDialogComponent } from '../confirm-dialog/confirm-dialog.component';

/** Input data for {@link TaskFormDialogComponent}: the task to edit, or the contact/deal to link a new task to. */
export interface TaskFormDialogData {
  task?: TaskResponse | null;
  contactId?: number | null;
  dealId?: number | null;
}

/**
 * Result of {@link TaskFormDialogComponent}: the created/updated task,
 * `'deleted'` if the task was deleted, or `undefined` if cancelled.
 */
export type TaskFormDialogResult = TaskResponse | 'deleted' | undefined;

/**
 * "Add Task" / "Edit Task" drawer (docs/DESIGN.md §5.6, §8.1, requirements
 * TSK-01, TSK-03): title, description, due date, assignee, and optional
 * Contact/Deal links.
 *
 * In create mode, `data.contactId`/`data.dealId` (if given) preselect the
 * Contact/Deal pickers. In edit mode (`data.task` set), the form is
 * pre-filled from the task and a Delete action is available.
 *
 * Opened via `MatDialog.open(TaskFormDialogComponent, { data, panelClass: 'drawer-panel' })`;
 * `afterClosed()` resolves to the created/updated `TaskResponse`, `'deleted'`
 * if the task was deleted, or `undefined` if cancelled.
 */
@Component({
  selector: 'app-task-form-dialog',
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
  templateUrl: './task-form-dialog.component.html',
  styleUrl: './task-form-dialog.component.scss',
})
export class TaskFormDialogComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly dialog = inject(MatDialog);
  private readonly dialogRef = inject(MatDialogRef<TaskFormDialogComponent, TaskFormDialogResult>);
  private readonly authService = inject(AuthService);
  private readonly contactService = inject(ContactService);
  private readonly dealService = inject(DealService);
  private readonly taskService = inject(TaskService);
  private readonly userService = inject(UserService);

  /** The task being edited, or the contact/deal to link a new task to. */
  protected readonly data = inject<TaskFormDialogData>(MAT_DIALOG_DATA);

  /** `true` when editing an existing task; `false` when creating a new one. */
  readonly isEditMode = computed(() => this.data.task != null);

  /** All users, for the assignee select. */
  readonly users = signal<UserResponse[]>([]);

  /** Contacts available for the contact picker. */
  readonly contacts = signal<ContactResponse[]>([]);

  /** Deals available for the deal picker. */
  readonly deals = signal<DealResponse[]>([]);

  /** `true` while reference data is loading. */
  readonly loading = signal(true);

  /** `true` while the task is being saved. */
  readonly saving = signal(false);

  /** User-facing error message from the last failed load/save, or `null`. */
  readonly error = signal<string | null>(null);

  /** Task form: title, optional description/due date, assignee, and optional contact/deal links. */
  readonly form = this.fb.group({
    title: this.fb.nonNullable.control('', Validators.required),
    description: this.fb.control<string | null>(null),
    dueDate: this.fb.control<string | null>(null),
    assigneeId: this.fb.control<number | null>(null, Validators.required),
    contactId: this.fb.control<number | null>(null),
    dealId: this.fb.control<number | null>(null),
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
   * Loads reference data (users, contacts, and deals) and, in edit mode,
   * populates the form with the task being edited; in create mode, defaults
   * the assignee to the current user and preselects the Contact/Deal pickers
   * from `data.contactId`/`data.dealId`.
   */
  ngOnInit(): void {
    // Keep `contactId`/`dealId` in sync with the free-text picker inputs:
    // resolve each to a known contact/deal by name, or clear it if the text
    // no longer matches one.
    this.contactInput.valueChanges.subscribe((value) => {
      const match = this.contacts().find((contact) => `${contact.firstName} ${contact.lastName}` === value);
      this.form.controls.contactId.setValue(match?.id ?? null);
    });
    this.dealInput.valueChanges.subscribe((value) => {
      const match = this.deals().find((deal) => deal.title === value);
      this.form.controls.dealId.setValue(match?.id ?? null);
    });

    forkJoin({
      users: this.userService.getUsers(),
      contacts: this.contactService.getContacts({ size: 100 }),
      pipeline: this.dealService.getPipeline(),
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
        this.users.set(result.users);
        this.contacts.set(result.contacts.content);
        this.deals.set(result.pipeline.stages.flatMap((stage) => stage.deals));

        const task = this.data.task;
        if (task) {
          this.form.setValue({
            title: task.title,
            description: task.description,
            dueDate: task.dueDate,
            assigneeId: task.assigneeId,
            contactId: task.contactId,
            dealId: task.dealId,
          });
          if (task.contactName) {
            this.contactInput.setValue(task.contactName);
          }
          if (task.dealTitle) {
            this.dealInput.setValue(task.dealTitle);
          }
        } else {
          this.form.controls.assigneeId.setValue(this.authService.currentUser()?.id ?? null);
          this.form.controls.contactId.setValue(this.data.contactId ?? null);
          this.form.controls.dealId.setValue(this.data.dealId ?? null);

          const contact = this.contacts().find((c) => c.id === this.data.contactId);
          if (contact) {
            this.contactInput.setValue(`${contact.firstName} ${contact.lastName}`);
          }
          const deal = this.deals().find((d) => d.id === this.data.dealId);
          if (deal) {
            this.dealInput.setValue(deal.title);
          }
        }
      });
  }

  /**
   * Validates and submits the form: creates a new task or updates the
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
    const request: TaskCreateRequest = {
      title: values.title,
      description: values.description,
      dueDate: values.dueDate,
      assigneeId: values.assigneeId as number,
      contactId: values.contactId,
      dealId: values.dealId,
    };

    const task = this.data.task;
    const save$ = task ? this.taskService.updateTask(task.id, request) : this.taskService.createTask(request);

    save$
      .pipe(
        catchError(() => {
          this.saving.set(false);
          this.error.set('Something went wrong saving this task. Please try again.');
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

  /** Confirms and deletes this task, then closes the dialog with `'deleted'`. */
  delete(): void {
    const task = this.data.task;
    if (!task) {
      return;
    }

    this.dialog
      .open(ConfirmDialogComponent, {
        data: {
          title: `Delete "${task.title}"?`,
          message: 'This will permanently delete the task and cannot be undone.',
        },
      })
      .afterClosed()
      .subscribe((confirmed) => {
        if (confirmed) {
          this.taskService.deleteTask(task.id).subscribe(() => this.dialogRef.close('deleted'));
        }
      });
  }

  /** Closes the dialog without saving. */
  cancel(): void {
    this.dialogRef.close();
  }
}
