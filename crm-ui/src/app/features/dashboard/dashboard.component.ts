import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CurrencyPipe, DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { catchError, forkJoin, of } from 'rxjs';

import { AuthService } from '../../core/services/auth.service';
import { ActivityService } from '../../core/services/activity.service';
import { ContactService } from '../../core/services/contact.service';
import { DealService } from '../../core/services/deal.service';
import { TaskService } from '../../core/services/task.service';
import { ActivityResponse, ActivityType } from '../../core/models/activity.model';
import { DealStage, PipelineStageResponse } from '../../core/models/deal.model';
import { TaskResponse } from '../../core/models/task.model';

/** Pipeline stages shown on the pipeline summary chart, in display order (docs/DESIGN.md §5.2). */
const CHART_STAGES: DealStage[] = ['LEAD', 'QUALIFIED', 'PROPOSAL', 'NEGOTIATION', 'CLOSED_WON'];

/** Pipeline stages counted toward the "Open Deals" metric card. */
const OPEN_STAGES: DealStage[] = ['LEAD', 'QUALIFIED', 'PROPOSAL', 'NEGOTIATION'];

/** Human-readable label for each deal stage, used on the pipeline summary chart. */
const STAGE_LABELS: Record<DealStage, string> = {
  LEAD: 'Lead',
  QUALIFIED: 'Qualified',
  PROPOSAL: 'Proposal',
  NEGOTIATION: 'Negotiation',
  CLOSED_WON: 'Closed Won',
  CLOSED_LOST: 'Closed Lost',
};

/** Icon and colour token for each activity type (docs/DESIGN.md §5.2). */
const ACTIVITY_TYPE_META: Record<ActivityType, { icon: string; color: string }> = {
  CALL: { icon: 'call', color: 'var(--color-info)' },
  EMAIL: { icon: 'email', color: 'var(--color-primary)' },
  MEETING: { icon: 'groups', color: 'var(--color-success)' },
  NOTE: { icon: 'sticky_note_2', color: 'var(--color-text-secondary)' },
};

/** Today's date as an ISO `YYYY-MM-DD` string, matching `TaskResponse.dueDate`'s format. */
function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

/**
 * `true` if the given ISO timestamp falls within the last 7 days.
 *
 * @param isoTimestamp an ISO-8601 timestamp (e.g. `ContactResponse.createdAt`)
 */
function isWithinLastWeek(isoTimestamp: string): boolean {
  const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  return new Date(isoTimestamp).getTime() >= sevenDaysAgo;
}

/**
 * Dashboard summary page (docs/DESIGN.md §5.2, requirement DSH-01): three
 * metric cards, a pipeline summary chart, an upcoming-tasks widget, and a
 * recent-activity feed. Data is assembled client-side from the pipeline,
 * tasks, contacts, and activities endpoints (no dedicated dashboard endpoint
 * exists on the backend).
 */
@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [RouterLink, CurrencyPipe, DatePipe, MatIconModule, MatProgressSpinnerModule],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss',
})
export class DashboardComponent implements OnInit {
  private readonly authService = inject(AuthService);
  private readonly dealService = inject(DealService);
  private readonly taskService = inject(TaskService);
  private readonly activityService = inject(ActivityService);
  private readonly contactService = inject(ContactService);

  /** `true` while the initial dashboard data is loading. */
  readonly loading = signal(true);

  /** `true` if any of the dashboard's data requests failed. */
  readonly error = signal(false);

  /** Pipeline stages with their deal counts and total values, from `GET /api/deals/pipeline`. */
  readonly pipelineStages = signal<PipelineStageResponse[]>([]);

  /** The current user's incomplete tasks, ordered by due date (earliest first). */
  readonly myTasks = signal<TaskResponse[]>([]);

  /** Number of contacts created within the last 7 days. */
  readonly contactsThisWeek = signal(0);

  /** The 10 most recently logged activities, most recent first. */
  readonly recentActivities = signal<ActivityResponse[]>([]);

  /** Pipeline stages for the chart (`CHART_STAGES`), defaulting to a zero count if a stage has no deals. */
  readonly chartStages = computed<PipelineStageResponse[]>(() => {
    const stages = this.pipelineStages();
    return CHART_STAGES.map(
      (stage) => stages.find((s) => s.stage === stage) ?? { stage, count: 0, totalValue: 0, deals: [] },
    );
  });

  /** The largest deal count across `chartStages`, used to scale bar heights (minimum 1 to avoid divide-by-zero). */
  readonly maxStageCount = computed(() => Math.max(1, ...this.chartStages().map((s) => s.count)));

  /** Total number of open (non-closed) deals, for the "Open Deals" metric card. */
  readonly openDealsCount = computed(() =>
    this.pipelineStages()
      .filter((s) => OPEN_STAGES.includes(s.stage))
      .reduce((sum, s) => sum + s.count, 0),
  );

  /** Total value of open (non-closed) deals, for the "Open Deals" metric card. */
  readonly openPipelineValue = computed(() =>
    this.pipelineStages()
      .filter((s) => OPEN_STAGES.includes(s.stage))
      .reduce((sum, s) => sum + s.totalValue, 0),
  );

  /** Number of the current user's incomplete tasks due today, for the "My Tasks Due Today" metric card. */
  readonly tasksDueToday = computed(() => this.myTasks().filter((t) => t.dueDate === todayIso()).length);

  /** Up to 5 of the current user's soonest-due incomplete tasks, for the "My Tasks" widget. */
  readonly upcomingTasks = computed(() => this.myTasks().slice(0, 5));

  /**
   * Loads all dashboard data on init (pipeline, the current user's open
   * tasks, recently-created contacts, and recent activities).
   */
  ngOnInit(): void {
    this.loadDashboard();
  }

  /**
   * Fetches the pipeline, the current user's open tasks, recent contacts, and
   * recent activities in parallel, and populates the dashboard's signals. On
   * any request failure, sets `error` so the template can render a fallback
   * message.
   */
  loadDashboard(): void {
    this.loading.set(true);
    this.error.set(false);

    const userId = this.authService.currentUser()?.id ?? 0;

    forkJoin({
      pipeline: this.dealService.getPipeline(),
      tasks: this.taskService.getTasks({ assigneeId: userId, completed: false, size: 50, sort: 'dueDate,asc' }),
      contacts: this.contactService.getContacts({ size: 100, sort: 'createdAt,desc' }),
      activities: this.activityService.getActivities({ size: 10 }),
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
        this.pipelineStages.set(result.pipeline.stages);
        this.myTasks.set(result.tasks.content);
        this.contactsThisWeek.set(result.contacts.content.filter((c) => isWithinLastWeek(c.createdAt)).length);
        this.recentActivities.set(result.activities.content);
      });
  }

  /**
   * Marks a task complete from the "My Tasks" widget (optimistic UI, per
   * docs/DESIGN.md §8.2): removes it from `myTasks` immediately, then calls
   * `TaskService.toggleTask`. If the request fails, the task is restored to
   * the list (re-sorted by due date).
   *
   * @param task the task to mark complete
   */
  completeTask(task: TaskResponse): void {
    this.myTasks.update((tasks) => tasks.filter((t) => t.id !== task.id));

    this.taskService
      .toggleTask(task.id)
      .pipe(
        catchError(() => {
          this.myTasks.update((tasks) =>
            [...tasks, task].sort((a, b) => (a.dueDate ?? '').localeCompare(b.dueDate ?? '')),
          );
          return of(null);
        }),
      )
      .subscribe();
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

  /**
   * Classifies a task's due date relative to today, for the due-date chip's
   * colour (red if overdue, orange if due today, grey if in the future).
   *
   * @param dueDate the task's due date (`YYYY-MM-DD`)
   */
  dueDateClass(dueDate: string): 'overdue' | 'due-today' | 'upcoming' {
    const today = todayIso();
    if (dueDate < today) {
      return 'overdue';
    }
    if (dueDate === today) {
      return 'due-today';
    }
    return 'upcoming';
  }
}
