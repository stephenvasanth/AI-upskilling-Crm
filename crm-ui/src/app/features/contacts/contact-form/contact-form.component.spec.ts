import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ActivatedRoute, Router, convertToParamMap, provideRouter } from '@angular/router';

import { ContactFormComponent } from './contact-form.component';
import { AuthService } from '../../../core/services/auth.service';
import { environment } from '../../../../environments/environment';
import { CompanyResponse } from '../../../core/models/company.model';
import { ContactCreateRequest, ContactResponse } from '../../../core/models/contact.model';
import { TagResponse } from '../../../core/models/tag.model';
import { UserResponse } from '../../../core/models/user.model';

describe('ContactFormComponent', () => {
  let fixture: ComponentFixture<ContactFormComponent>;
  let component: ContactFormComponent;
  let httpMock: HttpTestingController;
  let router: Router;
  let authService: AuthService;

  const baseUser: UserResponse = {
    id: 7,
    firstName: 'Ada',
    lastName: 'Lovelace',
    email: 'ada@crm.local',
    role: 'USER',
    active: true,
    createdAt: '2026-01-01T00:00:00Z',
  };

  const companies: CompanyResponse[] = [
    { id: 1, name: 'Acme Corp' },
    { id: 2, name: 'Globex' },
  ];

  const users: UserResponse[] = [baseUser, { ...baseUser, id: 8, firstName: 'Grace', lastName: 'Hopper' }];

  const tags: TagResponse[] = [
    { id: 1, name: 'VIP', color: '#4F46E5' },
    { id: 2, name: 'Lead', color: '#10B981' },
  ];

  function existingContact(): ContactResponse {
    return {
      id: 5,
      firstName: 'Existing',
      lastName: 'Contact',
      email: 'existing@crm.local',
      phone: '555-0100',
      title: 'CTO',
      companyId: 1,
      companyName: 'Acme Corp',
      ownerId: 8,
      ownerName: 'Grace Hopper',
      tags: [tags[0]],
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
    };
  }

  async function setup(paramMap: Record<string, string> = {}): Promise<void> {
    await TestBed.configureTestingModule({
      imports: [ContactFormComponent],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: convertToParamMap(paramMap) } } },
      ],
    }).compileComponents();

    httpMock = TestBed.inject(HttpTestingController);
    router = TestBed.inject(Router);
    authService = TestBed.inject(AuthService);
    authService.setCurrentUser(baseUser);

    fixture = TestBed.createComponent(ContactFormComponent);
    component = fixture.componentInstance;
  }

  /** Triggers `ngOnInit` and flushes the companies/users/tags (and, for edit mode, contact) requests. */
  function flushLoad(contact?: ContactResponse): void {
    fixture.detectChanges();
    httpMock.expectOne(`${environment.apiUrl}/companies`).flush(companies);
    httpMock.expectOne(`${environment.apiUrl}/users`).flush(users);
    httpMock.expectOne(`${environment.apiUrl}/tags`).flush(tags);
    if (contact) {
      httpMock.expectOne(`${environment.apiUrl}/contacts/${contact.id}`).flush(contact);
    }
  }

  afterEach(() => {
    httpMock.verify();
    localStorage.clear();
  });

  it('defaults the owner to the current user when creating a new contact', async () => {
    await setup();
    flushLoad();

    expect(component.isEditMode()).toBe(false);
    expect(component.loading()).toBe(false);
    expect(component.form.controls.ownerId.value).toBe(7);
    expect(component.form.controls.firstName.value).toBe('');
  });

  it('does not submit when required fields are missing', async () => {
    await setup();
    flushLoad();

    component.submit();

    expect(component.form.controls.firstName.touched).toBe(true);
    httpMock.expectNone((req) => req.method === 'POST');
  });

  it('creates a contact and navigates to its detail page', async () => {
    await setup();
    flushLoad();
    spyOn(router, 'navigate');

    component.form.patchValue({ firstName: 'New', lastName: 'Person' });
    component.submit();

    const req = httpMock.expectOne(`${environment.apiUrl}/contacts`);
    expect(req.request.method).toBe('POST');
    expect((req.request.body as ContactCreateRequest).ownerId).toBe(7);
    expect((req.request.body as ContactCreateRequest).firstName).toBe('New');

    req.flush({
      id: 99,
      firstName: 'New',
      lastName: 'Person',
      email: null,
      phone: null,
      title: null,
      companyId: null,
      companyName: null,
      ownerId: 7,
      ownerName: 'Ada Lovelace',
      tags: [],
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
    });

    expect(router.navigate).toHaveBeenCalledWith(['/contacts', 99]);
  });

  it('populates the form, company input, and selected tags in edit mode', async () => {
    await setup({ id: '5' });
    flushLoad(existingContact());

    expect(component.isEditMode()).toBe(true);
    expect(component.form.controls.firstName.value).toBe('Existing');
    expect(component.form.controls.ownerId.value).toBe(8);
    expect(component.companyInput.value).toBe('Acme Corp');
    expect(component.form.controls.companyId.value).toBe(1);
    expect(component.selectedTagIds()).toEqual([1]);
  });

  it('updates a contact and navigates to its detail page', async () => {
    await setup({ id: '5' });
    flushLoad(existingContact());
    spyOn(router, 'navigate');

    component.submit();

    const req = httpMock.expectOne(`${environment.apiUrl}/contacts/5`);
    expect(req.request.method).toBe('PUT');
    req.flush(existingContact());

    expect(router.navigate).toHaveBeenCalledWith(['/contacts', 5]);
  });

  it('resolves companyId from the company input text, clearing it if no company matches', async () => {
    await setup();
    flushLoad();

    component.companyInput.setValue('Globex');
    expect(component.form.controls.companyId.value).toBe(2);

    component.companyInput.setValue('Unknown Co');
    expect(component.form.controls.companyId.value).toBeNull();
  });

  it('adds and removes tags', async () => {
    await setup();
    flushLoad();

    component.addTag(1);
    expect(component.selectedTagIds()).toEqual([1]);
    expect(component.availableTags().map((tag) => tag.id)).toEqual([2]);

    component.removeTag(1);
    expect(component.selectedTagIds()).toEqual([]);
    expect(component.availableTags().map((tag) => tag.id)).toEqual([1, 2]);
  });

  it('cancel navigates to the list when creating', async () => {
    await setup();
    flushLoad();
    spyOn(router, 'navigate');

    component.cancel();
    expect(router.navigate).toHaveBeenCalledWith(['/contacts']);
  });

  it('cancel navigates to the contact detail page when editing', async () => {
    await setup({ id: '5' });
    flushLoad(existingContact());
    spyOn(router, 'navigate');

    component.cancel();
    expect(router.navigate).toHaveBeenCalledWith(['/contacts', 5]);
  });

  it('shows an error message if reference data fails to load', async () => {
    await setup();
    fixture.detectChanges();
    httpMock
      .expectOne(`${environment.apiUrl}/companies`)
      .flush('boom', { status: 500, statusText: 'Internal Server Error' });
    httpMock.match(() => true);

    expect(component.loading()).toBe(false);
    expect(component.error()).toBe('Something went wrong loading this form. Please try again.');
  });
});
