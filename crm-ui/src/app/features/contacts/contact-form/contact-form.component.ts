import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { catchError, forkJoin, of } from 'rxjs';

import { AuthService } from '../../../core/services/auth.service';
import { CompanyService } from '../../../core/services/company.service';
import { ContactService } from '../../../core/services/contact.service';
import { TagService } from '../../../core/services/tag.service';
import { UserService } from '../../../core/services/user.service';
import { CompanyResponse } from '../../../core/models/company.model';
import { ContactCreateRequest } from '../../../core/models/contact.model';
import { TagResponse } from '../../../core/models/tag.model';
import { UserResponse } from '../../../core/models/user.model';
import { TagChipComponent } from '../../../shared/tag-chip/tag-chip.component';

/**
 * Contact create/edit form (docs/DESIGN.md §5.3.3, requirements CON-01,
 * CON-02, CON-08, CON-09): a single centred form covering name, contact
 * details, company, owner, and tags. Used for both `/contacts/new` and
 * `/contacts/:id/edit`.
 */
@Component({
  selector: 'app-contact-form',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatAutocompleteModule,
    MatButtonModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatProgressSpinnerModule,
    MatSelectModule,
    TagChipComponent,
  ],
  templateUrl: './contact-form.component.html',
  styleUrl: './contact-form.component.scss',
})
export class ContactFormComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly authService = inject(AuthService);
  private readonly contactService = inject(ContactService);
  private readonly companyService = inject(CompanyService);
  private readonly userService = inject(UserService);
  private readonly tagService = inject(TagService);

  /** The contact id being edited, or `null` when creating a new contact. */
  readonly contactId = signal<number | null>(null);

  /** `true` while the form's reference data (and, in edit mode, the contact) is loading. */
  readonly loading = signal(true);

  /** `true` while the form is being submitted. */
  readonly saving = signal(false);

  /** User-facing error message from the last failed load/save, or `null`. */
  readonly error = signal<string | null>(null);

  /** All companies, for the company autocomplete. */
  readonly companies = signal<CompanyResponse[]>([]);

  /** All users, for the owner select. */
  readonly users = signal<UserResponse[]>([]);

  /** All tags, for the "Add tag" select. */
  readonly allTags = signal<TagResponse[]>([]);

  /** Ids of the tags currently assigned to this contact. */
  readonly selectedTagIds = signal<number[]>([]);

  /** Free-text company search box. Matched against `companies` by name to resolve `companyId`. */
  readonly companyInput = this.fb.nonNullable.control('');

  private readonly companySearchTerm = toSignal(this.companyInput.valueChanges, { initialValue: '' });

  /** Companies whose name contains the current `companyInput` text (case-insensitive). */
  readonly filteredCompanies = computed(() => {
    const term = this.companySearchTerm().trim().toLowerCase();
    if (!term) {
      return this.companies();
    }
    return this.companies().filter((company) => company.name.toLowerCase().includes(term));
  });

  /** Tags not yet assigned to this contact, for the "Add tag" select. */
  readonly availableTags = computed(() => this.allTags().filter((tag) => !this.selectedTagIds().includes(tag.id)));

  /** The contact's currently-assigned tags, in selection order. */
  readonly selectedTags = computed(() =>
    this.selectedTagIds()
      .map((id) => this.allTags().find((tag) => tag.id === id))
      .filter((tag): tag is TagResponse => tag !== undefined),
  );

  /** Contact details form. */
  readonly form = this.fb.group({
    firstName: this.fb.nonNullable.control('', Validators.required),
    lastName: this.fb.nonNullable.control('', Validators.required),
    email: this.fb.control<string | null>(null, Validators.email),
    phone: this.fb.control<string | null>(null),
    title: this.fb.control<string | null>(null),
    companyId: this.fb.control<number | null>(null),
    ownerId: this.fb.control<number | null>(null, Validators.required),
  });

  /** `true` when editing an existing contact; `false` when creating a new one. */
  readonly isEditMode = computed(() => this.contactId() !== null);

  /**
   * Resolves the contact id from the route, loads reference data (companies,
   * users, tags) and, in edit mode, the contact itself, then populates the
   * form.
   */
  ngOnInit(): void {
    const idParam = this.route.snapshot.paramMap.get('id');
    const id = idParam ? Number(idParam) : null;
    this.contactId.set(id);

    // Keep `companyId` in sync with the free-text company input: resolve it
    // to a known company by name, or clear it if the text no longer matches one.
    this.companyInput.valueChanges.subscribe((value) => {
      const match = this.companies().find((company) => company.name === value);
      this.form.controls.companyId.setValue(match?.id ?? null);
    });

    this.loading.set(true);
    forkJoin({
      companies: this.companyService.getCompanies(),
      users: this.userService.getUsers(),
      tags: this.tagService.getTags(),
      contact: id !== null ? this.contactService.getContact(id) : of(null),
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
        this.companies.set(result.companies);
        this.users.set(result.users);
        this.allTags.set(result.tags);

        if (result.contact) {
          const contact = result.contact;
          this.form.setValue({
            firstName: contact.firstName,
            lastName: contact.lastName,
            email: contact.email,
            phone: contact.phone,
            title: contact.title,
            companyId: contact.companyId,
            ownerId: contact.ownerId,
          });
          this.companyInput.setValue(contact.companyName ?? '');
          this.selectedTagIds.set(contact.tags.map((tag) => tag.id));
        } else {
          this.form.controls.ownerId.setValue(this.authService.currentUser()?.id ?? null);
        }
      });
  }

  /**
   * Adds a tag to `selectedTagIds`.
   *
   * @param tagId the tag id selected from the "Add tag" dropdown
   */
  addTag(tagId: number | null): void {
    if (tagId === null) {
      return;
    }
    this.selectedTagIds.update((ids) => [...ids, tagId]);
  }

  /**
   * Removes a tag from `selectedTagIds`.
   *
   * @param tagId the tag id to remove
   */
  removeTag(tagId: number): void {
    this.selectedTagIds.update((ids) => ids.filter((existing) => existing !== tagId));
  }

  /**
   * Validates and submits the form: creates a new contact or updates the
   * existing one, then navigates to its detail page.
   */
  submit(): void {
    if (this.form.invalid || this.saving()) {
      this.form.markAllAsTouched();
      return;
    }

    this.saving.set(true);
    this.error.set(null);

    const values = this.form.getRawValue();
    const request: ContactCreateRequest = {
      firstName: values.firstName,
      lastName: values.lastName,
      email: values.email,
      phone: values.phone,
      title: values.title,
      companyId: values.companyId,
      ownerId: values.ownerId as number,
      tagIds: this.selectedTagIds(),
    };

    const id = this.contactId();
    const save$ =
      id !== null ? this.contactService.updateContact(id, request) : this.contactService.createContact(request);

    save$
      .pipe(
        catchError(() => {
          this.saving.set(false);
          this.error.set('Something went wrong saving this contact. Please try again.');
          return of(null);
        }),
      )
      .subscribe((contact) => {
        if (!contact) {
          return;
        }
        this.saving.set(false);
        this.router.navigate(['/contacts', contact.id]);
      });
  }

  /** Navigates back without saving: to the contact's detail page when editing, or the list when creating. */
  cancel(): void {
    const id = this.contactId();
    this.router.navigate(id !== null ? ['/contacts', id] : ['/contacts']);
  }
}
