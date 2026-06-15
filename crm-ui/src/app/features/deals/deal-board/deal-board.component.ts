import { Component, OnInit, inject, signal } from '@angular/core';
import { CurrencyPipe, DatePipe } from '@angular/common';
import { CdkDragDrop, DragDropModule, moveItemInArray, transferArrayItem } from '@angular/cdk/drag-drop';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { catchError, of } from 'rxjs';

import { DealService } from '../../../core/services/deal.service';
import { DealResponse, DealStage, PipelineStageResponse } from '../../../core/models/deal.model';
import { AvatarComponent } from '../../../shared/avatar/avatar.component';
import { DealFormDialogComponent } from '../../../shared/deal-form-dialog/deal-form-dialog.component';

/** Human-readable label for each deal stage (docs/DESIGN.md §5.4). */
const STAGE_LABELS: Record<DealStage, string> = {
  LEAD: 'Lead',
  QUALIFIED: 'Qualified',
  PROPOSAL: 'Proposal',
  NEGOTIATION: 'Negotiation',
  CLOSED_WON: 'Closed Won',
  CLOSED_LOST: 'Closed Lost',
};

/** Accent colour for each deal stage's column header (docs/DESIGN.md §5.4). */
const STAGE_COLORS: Record<DealStage, string> = {
  LEAD: '#94A3B8',
  QUALIFIED: '#3B82F6',
  PROPOSAL: '#8B5CF6',
  NEGOTIATION: '#F59E0B',
  CLOSED_WON: '#10B981',
  CLOSED_LOST: '#EF4444',
};

/** A person's first and last name, split from a combined "First Last" display name. */
interface NameParts {
  first: string;
  last: string;
}

/**
 * Splits a "First Last" display name (e.g. `DealResponse.contactName`) into
 * first/last parts for {@link AvatarComponent}.
 *
 * @param fullName the combined display name
 */
function splitName(fullName: string): NameParts {
  const [first = '', last = ''] = fullName.split(' ');
  return { first, last };
}

/** Today's date as an ISO `yyyy-MM-dd` string, for overdue close-date comparisons. */
function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

/**
 * Deals Kanban pipeline board (docs/DESIGN.md §5.4, requirements DEA-01 to
 * DEA-08): one column per pipeline stage, each showing its deal count, total
 * value, and deal cards. Deals can be dragged between columns to change
 * their stage (requirement DEA-04, applied optimistically per
 * docs/DESIGN.md §8.2), or clicked to open the edit drawer. The "New Deal"
 * button opens the create drawer.
 */
@Component({
  selector: 'app-deal-board',
  standalone: true,
  imports: [
    CurrencyPipe,
    DatePipe,
    DragDropModule,
    MatButtonModule,
    MatDialogModule,
    MatIconModule,
    MatProgressSpinnerModule,
    AvatarComponent,
  ],
  templateUrl: './deal-board.component.html',
  styleUrl: './deal-board.component.scss',
})
export class DealBoardComponent implements OnInit {
  private readonly dialog = inject(MatDialog);
  private readonly dealService = inject(DealService);

  /** The pipeline, one entry per stage, in display order. */
  readonly pipeline = signal<PipelineStageResponse[]>([]);

  /** `true` while the pipeline is loading. */
  readonly loading = signal(true);

  /** `true` if the pipeline failed to load. */
  readonly error = signal(false);

  /** Loads the pipeline on init. */
  ngOnInit(): void {
    this.load();
  }

  /** Fetches the Kanban pipeline: every stage with its deals, count, and total value. */
  load(): void {
    this.loading.set(true);
    this.error.set(false);

    this.dealService
      .getPipeline()
      .pipe(
        catchError(() => {
          this.error.set(true);
          return of(null);
        }),
      )
      .subscribe((pipeline) => {
        this.loading.set(false);
        if (pipeline) {
          this.pipeline.set(pipeline.stages);
        }
      });
  }

  /** Opens the "New Deal" drawer, reloading the pipeline if a deal was created. */
  newDeal(): void {
    this.dialog
      .open(DealFormDialogComponent, { data: {}, panelClass: 'drawer-panel' })
      .afterClosed()
      .subscribe((result) => {
        if (result) {
          this.load();
        }
      });
  }

  /** Opens the edit drawer for a deal, reloading the pipeline if it was changed or deleted. */
  editDeal(deal: DealResponse): void {
    this.dialog
      .open(DealFormDialogComponent, { data: { deal }, panelClass: 'drawer-panel' })
      .afterClosed()
      .subscribe((result) => {
        if (result) {
          this.load();
        }
      });
  }

  /**
   * Handles dropping a deal card, either reordering it within a column or
   * moving it to a new stage. Stage changes are applied optimistically and
   * persisted via `PATCH /api/deals/{id}/stage`; on failure the move is
   * reverted (the global error interceptor shows a toast).
   *
   * @param event the CDK drag-drop event
   * @param targetStage the stage of the column the card was dropped into
   */
  drop(event: CdkDragDrop<DealResponse[]>, targetStage: DealStage): void {
    if (event.previousContainer === event.container) {
      if (event.previousIndex !== event.currentIndex) {
        moveItemInArray(event.container.data, event.previousIndex, event.currentIndex);
        this.pipeline.set([...this.pipeline()]);
      }
      return;
    }

    const movedDeal = event.previousContainer.data[event.previousIndex];
    const previousStage = movedDeal.stage;

    transferArrayItem(event.previousContainer.data, event.container.data, event.previousIndex, event.currentIndex);
    movedDeal.stage = targetStage;
    this.recalculateTotals();
    this.pipeline.set([...this.pipeline()]);

    this.dealService.updateDealStage(movedDeal.id, { stage: targetStage }).subscribe({
      error: () => {
        transferArrayItem(
          event.container.data,
          event.previousContainer.data,
          event.currentIndex,
          event.previousIndex,
        );
        movedDeal.stage = previousStage;
        this.recalculateTotals();
        this.pipeline.set([...this.pipeline()]);
      },
    });
  }

  /** Recomputes each stage's deal count and total value from its current `deals` array. */
  private recalculateTotals(): void {
    for (const stage of this.pipeline()) {
      stage.count = stage.deals.length;
      stage.totalValue = stage.deals.reduce((sum, deal) => sum + deal.value, 0);
    }
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
   * The accent colour for a pipeline stage's column header.
   *
   * @param stage the deal stage
   */
  stageColor(stage: DealStage): string {
    return STAGE_COLORS[stage];
  }

  /**
   * Splits a deal's linked contact name into first/last parts for
   * {@link AvatarComponent}.
   *
   * @param deal the deal
   */
  contactName(deal: DealResponse): NameParts {
    return deal.contactName ? splitName(deal.contactName) : { first: '', last: '' };
  }

  /**
   * `true` if the given close date is in the past, for highlighting overdue
   * deals (docs/DESIGN.md §5.4).
   *
   * @param closeDate the deal's close date, in `yyyy-MM-dd` format
   */
  isOverdue(closeDate: string): boolean {
    return closeDate < todayIso();
  }
}
