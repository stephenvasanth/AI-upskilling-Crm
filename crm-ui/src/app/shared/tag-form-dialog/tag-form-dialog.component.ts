import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { catchError, of } from 'rxjs';

import { TagService } from '../../core/services/tag.service';
import { TagResponse } from '../../core/models/tag.model';

/**
 * "New Tag" drawer (docs/DESIGN.md §5.8, §8.1, requirement TAG-01): a name
 * field and a colour picker (native colour swatch paired with a hex input).
 *
 * Opened via `MatDialog.open(TagFormDialogComponent, { panelClass: 'drawer-panel' })`;
 * `afterClosed()` resolves to the created `TagResponse`, or `undefined` if cancelled.
 */
@Component({
  selector: 'app-tag-form-dialog',
  standalone: true,
  imports: [ReactiveFormsModule, MatButtonModule, MatDialogModule, MatFormFieldModule, MatInputModule, MatProgressSpinnerModule],
  templateUrl: './tag-form-dialog.component.html',
  styleUrl: './tag-form-dialog.component.scss',
})
export class TagFormDialogComponent {
  private readonly fb = inject(FormBuilder);
  private readonly dialogRef = inject(MatDialogRef<TagFormDialogComponent, TagResponse | undefined>);
  private readonly tagService = inject(TagService);

  /** `true` while the tag is being saved. */
  readonly saving = signal(false);

  /** User-facing error message from the last failed save, or `null`. */
  readonly error = signal<string | null>(null);

  /** Tag form: name and a 7-character hex colour code. */
  readonly form = this.fb.group({
    name: this.fb.nonNullable.control('', [Validators.required, Validators.maxLength(50)]),
    color: this.fb.nonNullable.control('#4F46E5', [Validators.required, Validators.pattern(/^#[0-9A-Fa-f]{6}$/)]),
  });

  /**
   * Mirrors a native `<input type="color">` change into the `color` form
   * control, keeping it in sync with the hex text field.
   *
   * @param event the colour input's `input` event
   */
  onSwatchChange(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.form.controls.color.setValue(value);
  }

  /** Validates and submits the form, creating the tag and closing the dialog with the result. */
  submit(): void {
    if (this.form.invalid || this.saving()) {
      this.form.markAllAsTouched();
      return;
    }

    this.saving.set(true);
    this.error.set(null);

    this.tagService
      .createTag(this.form.getRawValue())
      .pipe(
        catchError((err: HttpErrorResponse) => {
          this.saving.set(false);
          this.error.set(
            err.status === 409 ? 'A tag with this name already exists.' : 'Something went wrong saving this tag. Please try again.',
          );
          return of(null);
        }),
      )
      .subscribe((created) => {
        if (!created) {
          return;
        }
        this.saving.set(false);
        this.dialogRef.close(created);
      });
  }

  /** Closes the dialog without saving. */
  cancel(): void {
    this.dialogRef.close();
  }
}
