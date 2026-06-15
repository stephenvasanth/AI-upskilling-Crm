import { Component, OnInit, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { catchError, of } from 'rxjs';

import { TagService } from '../../../core/services/tag.service';
import { TagResponse } from '../../../core/models/tag.model';
import { ConfirmDialogComponent } from '../../../shared/confirm-dialog/confirm-dialog.component';
import { TagFormDialogComponent } from '../../../shared/tag-form-dialog/tag-form-dialog.component';

/**
 * Tag management page (docs/DESIGN.md §5.8, ADMIN only, requirements TAG-01
 * to TAG-03): a simple list of tags with colour swatches, a "New Tag" button
 * that opens {@link TagFormDialogComponent} as a drawer, and a delete action
 * per row confirmed via {@link ConfirmDialogComponent}.
 */
@Component({
  selector: 'app-tag-list',
  standalone: true,
  imports: [MatButtonModule, MatIconModule, MatProgressSpinnerModule],
  templateUrl: './tag-list.component.html',
  styleUrl: './tag-list.component.scss',
})
export class TagListComponent implements OnInit {
  private readonly dialog = inject(MatDialog);
  private readonly tagService = inject(TagService);

  /** All tags, ordered by name. */
  readonly tags = signal<TagResponse[]>([]);

  /** `true` while the initial list is loading. */
  readonly loading = signal(true);

  /** `true` if the initial list failed to load. */
  readonly error = signal(false);

  ngOnInit(): void {
    this.loadTags();
  }

  /** Loads (or reloads) the full list of tags. */
  loadTags(): void {
    this.loading.set(true);
    this.error.set(false);
    this.tagService
      .getTags()
      .pipe(
        catchError(() => {
          this.error.set(true);
          return of(null);
        }),
      )
      .subscribe((tags) => {
        this.loading.set(false);
        if (tags) {
          this.tags.set(tags);
        }
      });
  }

  /** Opens the "New Tag" drawer and reloads the list if a tag was created. */
  newTag(): void {
    this.dialog
      .open(TagFormDialogComponent, { panelClass: 'drawer-panel' })
      .afterClosed()
      .subscribe((result) => {
        if (result) {
          this.loadTags();
        }
      });
  }

  /** Confirms and deletes the given tag, then reloads the list. */
  deleteTag(tag: TagResponse): void {
    this.dialog
      .open(ConfirmDialogComponent, {
        data: {
          title: `Delete "${tag.name}"?`,
          message: 'This will remove the tag from every contact it is assigned to. This cannot be undone.',
        },
      })
      .afterClosed()
      .subscribe((confirmed) => {
        if (confirmed) {
          this.tagService.deleteTag(tag.id).subscribe(() => this.loadTags());
        }
      });
  }
}
