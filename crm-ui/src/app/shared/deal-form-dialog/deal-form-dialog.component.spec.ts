import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { MAT_DIALOG_DATA, MatDialog, MatDialogRef } from '@angular/material/dialog';
import { of } from 'rxjs';

import { DealFormDialogComponent, DealFormDialogData, DealFormDialogResult } from './deal-form-dialog.component';
import { AuthService } from '../../core/services/auth.service';
import { environment } from '../../../environments/environment';
import { ContactResponse } from '../../core/models/contact.model';
import { DealResponse } from '../../core/models/deal.model';
import { PageResponse } from '../../core/models/page.model';
import { UserResponse } from '../../core/models/user.model';

describe('DealFormDialogComponent', () => {
  let fixture: ComponentFixture<DealFormDialogComponent>;
  let component: DealFormDialogComponent;
  let httpMock: HttpTestingController;
  let dialogRef: jasmine.SpyObj<MatDialogRef<DealFormDialogComponent, DealFormDialogResult>>;

  const currentUser: UserResponse = {
    id: 7,
    firstName: 'Ada',
    lastName: 'Lovelace',
    email: 'ada@crm.local',
    role: 'USER',
    active: true,
    createdAt: '2026-01-01T00:00:00Z',
  };

  const users: UserResponse[] = [currentUser, { ...currentUser, id: 8, firstName: 'Grace', lastName: 'Hopper' }];

  const contacts: ContactResponse[] = [
    {
      id: 5,
      firstName: 'Ada',
      lastName: 'Lovelace',
      email: 'ada@crm.local',
      phone: null,
      title: null,
      companyId: null,
      companyName: null,
      ownerId: 7,
      ownerName: 'Ada Lovelace',
      tags: [],
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
    },
  ];

  function contactsPage(): PageResponse<ContactResponse> {
    return { content: contacts, page: 0, size: 100, totalElements: 1, totalPages: 1 };
  }

  function deal(overrides: Partial<DealResponse> = {}): DealResponse {
    return {
      id: 1,
      title: 'Acme Renewal',
      value: 5000,
      stage: 'PROPOSAL',
      closeDate: '2026-07-01',
      contactId: 5,
      contactName: 'Ada Lovelace',
      ownerId: 7,
      ownerName: 'Ada Lovelace',
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
      ...overrides,
    };
  }

  async function setup(data: DealFormDialogData = {}): Promise<void> {
    dialogRef = jasmine.createSpyObj('MatDialogRef', ['close']);

    await TestBed.configureTestingModule({
      imports: [DealFormDialogComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: MAT_DIALOG_DATA, useValue: data },
        { provide: MatDialogRef, useValue: dialogRef },
      ],
    }).compileComponents();

    httpMock = TestBed.inject(HttpTestingController);
    TestBed.inject(AuthService).setCurrentUser(currentUser);

    fixture = TestBed.createComponent(DealFormDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }

  function flushReferenceData(): void {
    httpMock.expectOne((req) => req.url === `${environment.apiUrl}/contacts`).flush(contactsPage());
    httpMock.expectOne(`${environment.apiUrl}/users`).flush(users);
  }

  afterEach(() => {
    httpMock.verify();
    localStorage.clear();
  });

  it('defaults the stage to Lead and the owner to the current user when creating', async () => {
    await setup();
    flushReferenceData();

    expect(component.loading()).toBe(false);
    expect(component.isEditMode()).toBe(false);
    expect(component.form.controls.stage.value).toBe('LEAD');
    expect(component.form.controls.ownerId.value).toBe(7);
  });

  it('populates the form when editing an existing deal', async () => {
    await setup({ deal: deal() });
    flushReferenceData();

    expect(component.isEditMode()).toBe(true);
    expect(component.form.value).toEqual(
      jasmine.objectContaining({
        title: 'Acme Renewal',
        value: 5000,
        stage: 'PROPOSAL',
        closeDate: '2026-07-01',
        contactId: 5,
        ownerId: 7,
      }),
    );
    expect(component.contactInput.value).toBe('Ada Lovelace');
  });

  it('blocks submit when the title is missing', async () => {
    await setup();
    flushReferenceData();

    component.form.controls.title.setValue('');
    component.submit();

    expect(component.form.controls.title.touched).toBe(true);
    httpMock.expectNone(`${environment.apiUrl}/deals`);
    expect(dialogRef.close).not.toHaveBeenCalled();
  });

  it('resolves contactId from the contact autocomplete', async () => {
    await setup();
    flushReferenceData();

    component.contactInput.setValue('Ada Lovelace');
    expect(component.form.controls.contactId.value).toBe(5);

    component.contactInput.setValue('Someone Unknown');
    expect(component.form.controls.contactId.value).toBeNull();
  });

  it('creates a deal and closes with the result', async () => {
    await setup();
    flushReferenceData();

    component.form.patchValue({ title: 'New Biz', value: 1000, stage: 'QUALIFIED', closeDate: '2026-08-01' });
    component.contactInput.setValue('Ada Lovelace');
    component.submit();

    const req = httpMock.expectOne(`${environment.apiUrl}/deals`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({
      title: 'New Biz',
      value: 1000,
      stage: 'QUALIFIED',
      closeDate: '2026-08-01',
      contactId: 5,
      ownerId: 7,
    });

    const created = deal({ id: 2, title: 'New Biz', value: 1000, stage: 'QUALIFIED', closeDate: '2026-08-01' });
    req.flush(created);

    expect(dialogRef.close).toHaveBeenCalledWith(created);
    expect(component.saving()).toBe(false);
  });

  it('updates a deal and closes with the result', async () => {
    await setup({ deal: deal() });
    flushReferenceData();

    component.form.controls.stage.setValue('NEGOTIATION');
    component.submit();

    const req = httpMock.expectOne(`${environment.apiUrl}/deals/1`);
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual(jasmine.objectContaining({ stage: 'NEGOTIATION' }));

    const updated = deal({ stage: 'NEGOTIATION' });
    req.flush(updated);

    expect(dialogRef.close).toHaveBeenCalledWith(updated);
  });

  it('shows an error message if saving fails', async () => {
    await setup();
    flushReferenceData();

    component.form.patchValue({ title: 'New Biz' });
    component.submit();

    httpMock.expectOne(`${environment.apiUrl}/deals`).flush('boom', { status: 500, statusText: 'Internal Server Error' });

    expect(component.saving()).toBe(false);
    expect(component.error()).toBe('Something went wrong saving this deal. Please try again.');
    expect(dialogRef.close).not.toHaveBeenCalled();
  });

  it('deletes the deal after confirmation and closes with "deleted"', async () => {
    await setup({ deal: deal() });
    flushReferenceData();

    spyOn(MatDialog.prototype, 'open').and.returnValue({ afterClosed: () => of(true) } as never);

    component.delete();

    httpMock.expectOne(`${environment.apiUrl}/deals/1`).flush(null);
    expect(dialogRef.close).toHaveBeenCalledWith('deleted');
  });

  it('does not delete when the confirmation is cancelled', async () => {
    await setup({ deal: deal() });
    flushReferenceData();

    spyOn(MatDialog.prototype, 'open').and.returnValue({ afterClosed: () => of(false) } as never);

    component.delete();

    httpMock.expectNone((req) => req.method === 'DELETE');
    expect(dialogRef.close).not.toHaveBeenCalled();
  });

  it('cancel closes the dialog without saving', async () => {
    await setup();
    flushReferenceData();

    component.cancel();

    expect(dialogRef.close).toHaveBeenCalledWith();
    httpMock.expectNone(`${environment.apiUrl}/deals`);
  });
});
