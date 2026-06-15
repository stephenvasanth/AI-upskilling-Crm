import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { catchError, of } from 'rxjs';

import { AuthService } from '../../../core/services/auth.service';
import { TaskListParams, TaskService } from '../../../core/services/task.service';
import { TaskResponse } from '../../../core/models/task.model';
import { AvatarComponent } from '../../../shared/avatar/avatar.component';
import { ConfirmDialogComponent } from '../../../shared/confirm-dialog/confirm-dialog.component';
import { TaskFormDialogComponent } from '../../../shared/task-form-dialog/task-form-dialog.component';

/** Filter tabs for the task list (docs/DESIGN.md §5.6). */
export type TaskFilter = 'all' | 'mine' | 'overdue' | 'due-today' | 'upcoming' | 'completed';

/** Filter tab definitions, in display order. */
const FILTER_TABS: { value: TaskFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'mine', label: 'My Tasks' },
  { value: 'overdue', label: 'Overdue' },
  { value: 'due-today', label: 'Due Today' },
  { value: 'upcoming', label: 'Upcoming' },
  { value: 'completed', label: 'Completed' },
];

/** A person's first and last name, split from a combined "First Last" display name. */
interface NameParts {
  first: string;
  last: string;
}

/**
 * Splits a combined "First Last" display name into first/last parts for {@link AvatarComponent}.
 *
 * @param fullName the combined display name
 */
function splitName(fullName: string): NameParts {
  const [first = '', last = ''] = fullName.split(' ');
  return { first, last };
}

/** Today's date as an ISO `YYYY-MM-DD` string, matching `TaskResponse.dueDate`'s format. */
function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

/**
 * Classifies a task's due date relative to today, for the due-date chip's
 * colour (red if overdue, orange if due today, grey if in the future).
 *
 * @param dueDate the task's due date (`YYYY-MM-DD`)
 */
function dueDateClass(dueDate: string): 'overdue' | 'due-today' | 'upcoming' {
  const today = todayIso();
  if (dueDate < today) {
    return 'overdue';
  }
  if (dueDate === today) {
    return 'due-today';
  }
  return 'upcoming';
}

/**
 * Tasks list page (docs/DESIGN.md §5.6, requirements TSK-01 to TSK-05):
 * filter tabs, a paginated task list with optimistic complete/incomplete
 * toggling, and "Add Task"/"Edit Task" drawers.
 */
@Component({
  selector: 'app-task-list',
  standalone: true,
  imports: [
    RouterLink,
    AvatarComponent,
    MatButtonModule,
    MatIconModule,
    MatMenuModule,
    MatPaginatorModule,
    MatProgressSpinnerModule,
  ],
  templateUrl: './task-list.component.html',
  styleUrl: './task-list.component.scss',
})
export class TaskListComponent implements OnInit {
  private readonly authService = inject(AuthService);
  private readonly dialog = inject(MatDialog);
  private readonly taskService = inject(TaskService);

  /** Filter tab definitions, for the template. */
  readonly filterTabs = FILTER_TABS;

  /** The currently selected filter tab. */
  readonly activeFilter = signal<TaskFilter>('all');

  /** The current page of tasks from the last load. */
  readonly tasks = signal<TaskResponse[]>([]);

  /** `true` while the task list is loading. */
  readonly loading = signal(true);

  /** `true` if the last load failed. */
  readonly error = signal(false);

  /** Total number of tasks matching the current filter, across all pages. */
  readonly totalElements = signal(0);

  /** Zero-based current page index. */
  readonly page = signal(0);

  /** Number of tasks per page. */
  readonly pageSize = signal(20);

  /**
   * Tasks for the current page, narrowed by the active filter's due-date
   * bucket (Overdue/Due Today/Upcoming), if any.
   */
  readonly filteredTasks = computed(() => {
    const filter = this.activeFilter();
    const tasks = this.tasks();
    if (filter === 'overdue' || filter === 'due-today' || filter === 'upcoming') {
      return tasks.filter((task) => task.dueDate != null && dueDateClass(task.dueDate) === filter);
    }
    return tasks;
  });

  /** Loads the first page of tasks on init. */
  ngOnInit(): void {
    this.loadTasks();
  }

  /**
   * Loads the current page of tasks for the active filter
   * (`GET /api/tasks?assigneeId&completed&page&size&sort`).
   */
  loadTasks(): void {
    this.loading.set(true);
    this.error.set(false);

    const filter = this.activeFilter();
    const params: TaskListParams = {
      page: this.page(),
      size: this.pageSize(),
      sort: 'dueDate,asc',
    };
    if (filter === 'mine') {
      params.assigneeId = this.authService.currentUser()?.id;
    } else if (filter === 'completed') {
      params.completed = true;
    } else if (filter !== 'all') {
      params.completed = false;
    }

    this.taskService
      .getTasks(params)
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
        this.tasks.set(result.content);
        this.totalElements.set(result.totalElements);
      });
  }

  /** Switches the active filter tab and reloads from the first page. */
  selectFilter(filter: TaskFilter): void {
    if (this.activeFilter() === filter) {
      return;
    }
    this.activeFilter.set(filter);
    this.page.set(0);
    this.loadTasks();
  }

  /** Loads the requested page/size from the paginator. */
  onPageChange(event: PageEvent): void {
    this.page.set(event.pageIndex);
    this.pageSize.set(event.pageSize);
    this.loadTasks();
  }

  /**
   * Toggles a task's completed state with optimistic UI: flips it
   * immediately, then calls `TaskService.toggleTask`. If the request fails,
   * the change is reverted.
   *
   * @param task the task to toggle
   */
  toggleTask(task: TaskResponse): void {
    this.tasks.update((tasks) => tasks.map((t) => (t.id === task.id ? { ...t, completed: !t.completed } : t)));

    this.taskService
      .toggleTask(task.id)
      .pipe(
        catchError(() => {
          this.tasks.update((tasks) => tasks.map((t) => (t.id === task.id ? { ...t, completed: task.completed } : t)));
          return of(null);
        }),
      )
      .subscribe();
  }

  /** Opens the "Add Task" drawer and reloads the list on success. */
  addTask(): void {
    this.dialog
      .open(TaskFormDialogComponent, { data: {}, panelClass: 'drawer-panel' })
      .afterClosed()
      .subscribe((result) => {
        if (result) {
          this.loadTasks();
        }
      });
  }

  /** Opens the "Edit Task" drawer for the given task and reloads the list on success. */
  editTask(task: TaskResponse): void {
    this.dialog
      .open(TaskFormDialogComponent, { data: { task }, panelClass: 'drawer-panel' })
      .afterClosed()
      .subscribe((result) => {
        if (result) {
          this.loadTasks();
        }
      });
  }

  /** Confirms and deletes a task, then reloads the list. */
  deleteTask(task: TaskResponse): void {
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
          this.taskService.deleteTask(task.id).subscribe(() => this.loadTasks());
        }
      });
  }

  /**
   * Classifies a task's due date for its chip's colour.
   *
   * @param dueDate the task's due date (`YYYY-MM-DD`)
   */
  dueDateClass(dueDate: string): 'overdue' | 'due-today' | 'upcoming' {
    return dueDateClass(dueDate);
  }

  /** Splits a task's assignee display name into first/last parts for the assignee avatar. */
  assignee(task: TaskResponse): NameParts {
    return splitName(task.assigneeName);
  }
}
