import { Component, OnInit, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { catchError, debounceTime, distinctUntilChanged, of } from 'rxjs';

import { ContactService } from '../../../core/services/contact.service';
import { ContactResponse } from '../../../core/models/contact.model';
import { TagResponse } from '../../../core/models/tag.model';
import { AvatarComponent } from '../../../shared/avatar/avatar.component';
import { TagChipComponent } from '../../../shared/tag-chip/tag-chip.component';
import { ConfirmDialogComponent } from '../../../shared/confirm-dialog/confirm-dialog.component';

/** Maximum number of tag chips shown per row before collapsing into a "+N" overflow badge. */
const MAX_VISIBLE_TAGS = 3;

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
 * Contacts list page (docs/DESIGN.md §5.3.1, requirements CON-03/CON-09): a
 * searchable, paginated table of contacts with avatar, company, email,
 * phone, tags, and owner columns, plus row-hover edit/delete actions.
 */
@Component({
  selector: 'app-contact-list',
  standalone: true,
  imports: [
    RouterLink,
    ReactiveFormsModule,
    MatButtonModule,
    MatDialogModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatPaginatorModule,
    MatProgressSpinnerModule,
    AvatarComponent,
    TagChipComponent,
  ],
  templateUrl: './contact-list.component.html',
  styleUrl: './contact-list.component.scss',
})
export class ContactListComponent implements OnInit {
  private readonly contactService = inject(ContactService);
  private readonly dialog = inject(MatDialog);
  private readonly router = inject(Router);

  /** Debounced (300ms) search box, bound to the "search" query parameter. */
  readonly searchControl = new FormControl('', { nonNullable: true });

  /** The current page of contacts. */
  readonly contacts = signal<ContactResponse[]>([]);

  /** `true` while a page of contacts is loading. */
  readonly loading = signal(true);

  /** `true` if the most recent request failed. */
  readonly error = signal(false);

  /** Total number of contacts matching the current search, across all pages. */
  readonly totalElements = signal(0);

  /** Zero-based current page index. */
  readonly page = signal(0);

  /** Number of rows per page. */
  readonly pageSize = signal(20);

  /**
   * Loads the first page on init, and reloads (from page 0) whenever the
   * search box changes, debounced by 300ms.
   */
  ngOnInit(): void {
    this.loadContacts();

    this.searchControl.valueChanges.pipe(debounceTime(300), distinctUntilChanged()).subscribe(() => {
      this.page.set(0);
      this.loadContacts();
    });
  }

  /**
   * Fetches the current page of contacts (search term, page index, and page
   * size), ordered by last name.
   */
  loadContacts(): void {
    this.loading.set(true);
    this.error.set(false);

    this.contactService
      .getContacts({
        search: this.searchControl.value || undefined,
        page: this.page(),
        size: this.pageSize(),
        sort: 'lastName,asc',
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
        this.contacts.set(result.content);
        this.totalElements.set(result.totalElements);
      });
  }

  /**
   * Handles `mat-paginator`'s page change event by updating the page index
   * and size and reloading.
   *
   * @param event the new page index/size
   */
  onPageChange(event: PageEvent): void {
    this.page.set(event.pageIndex);
    this.pageSize.set(event.pageSize);
    this.loadContacts();
  }

  /** Clears the search box, triggering a reload via `valueChanges`. */
  clearSearch(): void {
    this.searchControl.setValue('');
  }

  /** Navigates to the contact's detail page. */
  openContact(contact: ContactResponse): void {
    this.router.navigate(['/contacts', contact.id]);
  }

  /**
   * Navigates to the contact's edit form. Stops propagation so the row's
   * click handler doesn't also navigate to the detail page.
   *
   * @param contact the contact to edit
   * @param event the originating click event
   */
  edit(contact: ContactResponse, event: Event): void {
    event.stopPropagation();
    this.router.navigate(['/contacts', contact.id, 'edit']);
  }

  /**
   * Confirms and deletes a contact, then reloads the current page. Stops
   * propagation so the row's click handler doesn't also navigate.
   *
   * @param contact the contact to delete
   * @param event the originating click event
   */
  delete(contact: ContactResponse, event: Event): void {
    event.stopPropagation();

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
          this.contactService.deleteContact(contact.id).subscribe(() => this.loadContacts());
        }
      });
  }

  /** The first `MAX_VISIBLE_TAGS` tags for a contact, for the Tags column. */
  visibleTags(contact: ContactResponse): TagResponse[] {
    return contact.tags.slice(0, MAX_VISIBLE_TAGS);
  }

  /** The number of tags hidden beyond `MAX_VISIBLE_TAGS`, shown as a "+N" badge. */
  overflowCount(contact: ContactResponse): number {
    return Math.max(0, contact.tags.length - MAX_VISIBLE_TAGS);
  }

  /** Splits a contact's owner display name into first/last parts for the owner avatar. */
  ownerName(contact: ContactResponse): NameParts {
    return splitName(contact.ownerName);
  }
}
