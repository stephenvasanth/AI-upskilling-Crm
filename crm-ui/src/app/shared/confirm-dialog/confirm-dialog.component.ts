import { Component, inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';

/** Input data for {@link ConfirmDialogComponent}. */
export interface ConfirmDialogData {
  /** Dialog title, e.g. "Delete Contact?". */
  title: string;
  /** Descriptive message shown below the title. */
  message: string;
  /** Label for the confirm (danger) button. Defaults to "Delete". */
  confirmLabel?: string;
  /** Label for the cancel button. Defaults to "Cancel". */
  cancelLabel?: string;
}

/**
 * Generic confirmation modal (docs/DESIGN.md §6.6): a title, a descriptive
 * message, and Cancel/Confirm (danger) buttons.
 *
 * Opened via `MatDialog.open(ConfirmDialogComponent, { data })`;
 * `afterClosed()` resolves to `true` if confirmed, `false` if cancelled, or
 * `undefined` if dismissed via the backdrop/Escape key.
 */
@Component({
  selector: 'app-confirm-dialog',
  standalone: true,
  imports: [MatDialogModule, MatButtonModule],
  templateUrl: './confirm-dialog.component.html',
  styleUrl: './confirm-dialog.component.scss',
})
export class ConfirmDialogComponent {
  protected readonly data = inject<ConfirmDialogData>(MAT_DIALOG_DATA);
  private readonly dialogRef = inject(MatDialogRef<ConfirmDialogComponent, boolean>);

  /** Closes the dialog, resolving `afterClosed()` with `true`. */
  confirm(): void {
    this.dialogRef.close(true);
  }

  /** Closes the dialog, resolving `afterClosed()` with `false`. */
  cancel(): void {
    this.dialogRef.close(false);
  }
}
