import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';

import { ActivityFormDialogComponent, ActivityFormDialogData } from './activity-form-dialog.component';
import { environment } from '../../../environments/environment';
import { ActivityResponse } from '../../core/models/activity.model';
import { ContactResponse } from '../../core/models/contact.model';
import { DealResponse, PipelineResponse } from '../../core/models/deal.model';

describe('ActivityFormDialogComponent', () => {
  let fixture: ComponentFixture<ActivityFormDialogComponent>;
  let component: ActivityFormDialogComponent;
  let httpMock: HttpTestingController;
  let dialogRef: jasmine.SpyObj<MatDialogRef<ActivityFormDialogComponent, ActivityResponse>>;

  function activity(): ActivityResponse {
    return {
      id: 1,
      type: 'CALL',
      subject: 'Intro call',
      body: 'Discussed pricing',
      contactId: 5,
      contactName: 'Ada Lovelace',
      dealId: null,
      dealTitle: null,
      createdById: 7,
      createdByName: 'Ada Lovelace',
      createdAt: '2026-01-01T00:00:00Z',
    };
  }

  function contact(overrides: Partial<ContactResponse> = {}): ContactResponse {
    return {
      id: 5,
      firstName: 'Ada',
      lastName: 'Lovelace',
      email: 'ada@example.com',
      phone: null,
      title: null,
      companyId: null,
      companyName: null,
      ownerId: 7,
      ownerName: 'Grace Hopper',
      tags: [],
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
      ...overrides,
    };
  }

  function deal(overrides: Partial<DealResponse> = {}): DealResponse {
    return {
      id: 9,
      title: 'Big Deal',
      value: 5000,
      stage: 'LEAD',
      closeDate: null,
      contactId: 5,
      contactName: 'Ada Lovelace',
      ownerId: 7,
      ownerName: 'Grace Hopper',
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
      ...overrides,
    };
  }

  async function setup(data: ActivityFormDialogData = { contactId: 5 }): Promise<void> {
    dialogRef = jasmine.createSpyObj('MatDialogRef', ['close']);

    await TestBed.configureTestingModule({
      imports: [ActivityFormDialogComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: MAT_DIALOG_DATA, useValue: data },
        { provide: MatDialogRef, useValue: dialogRef },
      ],
    }).compileComponents();

    httpMock = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(ActivityFormDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }

  /** Flushes the contacts/deals requests fired by the link pickers (`showLinkPickers === true`). */
  function flushLinkPickerData(contacts: ContactResponse[] = [contact()], deals: DealResponse[] = [deal()]): void {
    httpMock.expectOne(`${environment.apiUrl}/contacts?size=100`).flush({
      content: contacts,
      page: 0,
      size: 100,
      totalElements: contacts.length,
      totalPages: 1,
    });

    const pipeline: PipelineResponse = {
      stages: [
        { stage: 'LEAD', count: deals.length, totalValue: 0, deals },
        { stage: 'QUALIFIED', count: 0, totalValue: 0, deals: [] },
        { stage: 'PROPOSAL', count: 0, totalValue: 0, deals: [] },
        { stage: 'NEGOTIATION', count: 0, totalValue: 0, deals: [] },
        { stage: 'CLOSED_WON', count: 0, totalValue: 0, deals: [] },
        { stage: 'CLOSED_LOST', count: 0, totalValue: 0, deals: [] },
      ],
    };
    httpMock.expectOne(`${environment.apiUrl}/deals/pipeline`).flush(pipeline);
    fixture.detectChanges();
  }

  afterEach(() => httpMock.verify());

  it('blocks submit when the subject is missing', async () => {
    await setup();

    component.submit();

    expect(component.form.controls.subject.touched).toBe(true);
    httpMock.expectNone(`${environment.apiUrl}/activities`);
    expect(dialogRef.close).not.toHaveBeenCalled();
  });

  it('logs the activity against the given contact and closes with the result', async () => {
    await setup({ contactId: 5 });

    component.form.patchValue({ type: 'CALL', subject: 'Intro call', body: 'Discussed pricing' });
    component.submit();

    const req = httpMock.expectOne(`${environment.apiUrl}/activities`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({
      type: 'CALL',
      subject: 'Intro call',
      body: 'Discussed pricing',
      contactId: 5,
      dealId: null,
    });

    req.flush(activity());

    expect(dialogRef.close).toHaveBeenCalledWith(activity());
    expect(component.saving()).toBe(false);
  });

  it('shows an error message if logging the activity fails', async () => {
    await setup();

    component.form.patchValue({ type: 'NOTE', subject: 'Note', body: null });
    component.submit();

    httpMock
      .expectOne(`${environment.apiUrl}/activities`)
      .flush('boom', { status: 500, statusText: 'Internal Server Error' });

    expect(component.saving()).toBe(false);
    expect(component.error()).toBe('Something went wrong logging this activity. Please try again.');
    expect(dialogRef.close).not.toHaveBeenCalled();
  });

  it('cancel closes the dialog without saving', async () => {
    await setup();

    component.cancel();

    expect(dialogRef.close).toHaveBeenCalledWith();
    httpMock.expectNone(`${environment.apiUrl}/activities`);
  });

  it('shows the contact and deal pickers and loads their options when no link is given', async () => {
    await setup({});

    expect(component.showLinkPickers).toBe(true);
    flushLinkPickerData();

    expect(component.contacts()).toEqual([contact()]);
    expect(component.deals()).toEqual([deal()]);

    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('Contact');
    expect(text).toContain('Deal');
  });

  it('does not show the link pickers when a contact or deal is given', async () => {
    await setup({ dealId: 9 });

    expect(component.showLinkPickers).toBe(false);
    httpMock.expectNone(`${environment.apiUrl}/contacts?size=100`);
    httpMock.expectNone(`${environment.apiUrl}/deals/pipeline`);
  });

  it('resolves contactId/dealId from the picker search text', async () => {
    await setup({});
    flushLinkPickerData();

    component.contactInput.setValue('Ada Lovelace');
    expect(component.form.controls.contactId.value).toBe(5);

    component.dealInput.setValue('Big Deal');
    expect(component.form.controls.dealId.value).toBe(9);

    component.contactInput.setValue('nobody');
    expect(component.form.controls.contactId.value).toBeNull();
  });

  it('blocks submit when neither a contact nor a deal is selected', async () => {
    await setup({});
    flushLinkPickerData();

    component.form.patchValue({ type: 'NOTE', subject: 'Stray note' });
    component.submit();

    expect(component.error()).toBe('Select a contact or a deal to log this activity against.');
    httpMock.expectNone(`${environment.apiUrl}/activities`);
    expect(dialogRef.close).not.toHaveBeenCalled();
  });

  it('submits with the contact resolved from the picker', async () => {
    await setup({});
    flushLinkPickerData();

    component.form.patchValue({ type: 'CALL', subject: 'Follow up' });
    component.contactInput.setValue('Ada Lovelace');
    component.submit();

    const req = httpMock.expectOne(`${environment.apiUrl}/activities`);
    expect(req.request.body).toEqual({
      type: 'CALL',
      subject: 'Follow up',
      body: null,
      contactId: 5,
      dealId: null,
    });

    req.flush(activity());
    expect(dialogRef.close).toHaveBeenCalledWith(activity());
  });
});
