import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ActivatedRoute, Router, convertToParamMap, provideRouter } from '@angular/router';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { of } from 'rxjs';

import { ContactDetailComponent } from './contact-detail.component';
import { ActivityFormDialogComponent } from '../../../shared/activity-form-dialog/activity-form-dialog.component';
import { TaskFormDialogComponent } from '../../../shared/task-form-dialog/task-form-dialog.component';
import { ConfirmDialogComponent } from '../../../shared/confirm-dialog/confirm-dialog.component';
import { environment } from '../../../../environments/environment';
import { ActivityResponse } from '../../../core/models/activity.model';
import { ContactResponse } from '../../../core/models/contact.model';
import { DealResponse, PipelineResponse } from '../../../core/models/deal.model';
import { PageResponse } from '../../../core/models/page.model';
import { TaskResponse } from '../../../core/models/task.model';

describe('ContactDetailComponent', () => {
  let fixture: ComponentFixture<ContactDetailComponent>;
  let component: ContactDetailComponent;
  let httpMock: HttpTestingController;
  let router: Router;

  function contact(): ContactResponse {
    return {
      id: 5,
      firstName: 'Ada',
      lastName: 'Lovelace',
      email: 'ada@crm.local',
      phone: '555-1234',
      title: 'Engineer',
      companyId: 1,
      companyName: 'Acme Corp',
      ownerId: 8,
      ownerName: 'Grace Hopper',
      tags: [{ id: 1, name: 'VIP', color: '#4F46E5' }],
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
    };
  }

  function deal(overrides: Partial<DealResponse> = {}): DealResponse {
    return {
      id: 1,
      title: 'Acme Renewal',
      value: 5000,
      stage: 'PROPOSAL',
      closeDate: null,
      contactId: 5,
      contactName: 'Ada Lovelace',
      ownerId: 8,
      ownerName: 'Grace Hopper',
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
      ...overrides,
    };
  }

  function pipeline(): PipelineResponse {
    return {
      stages: [
        {
          stage: 'LEAD',
          count: 1,
          totalValue: 1000,
          deals: [deal({ id: 2, contactId: 99, stage: 'LEAD', title: 'Other Deal' })],
        },
        { stage: 'PROPOSAL', count: 1, totalValue: 5000, deals: [deal()] },
      ],
    };
  }

  function activitiesPage(): PageResponse<ActivityResponse> {
    return {
      content: [
        {
          id: 1,
          type: 'CALL',
          subject: 'Intro call',
          body: 'Discussed pricing',
          contactId: 5,
          contactName: 'Ada Lovelace',
          dealId: null,
          dealTitle: null,
          createdById: 8,
          createdByName: 'Grace Hopper',
          createdAt: '2026-01-02T00:00:00Z',
        },
      ],
      page: 0,
      size: 50,
      totalElements: 1,
      totalPages: 1,
    };
  }

  async function setup(): Promise<void> {
    await TestBed.configureTestingModule({
      imports: [ContactDetailComponent],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: convertToParamMap({ id: '5' }) } } },
      ],
    }).compileComponents();

    httpMock = TestBed.inject(HttpTestingController);
    router = TestBed.inject(Router);

    fixture = TestBed.createComponent(ContactDetailComponent);
    component = fixture.componentInstance;
  }

  function flushLoad(): void {
    fixture.detectChanges();
    httpMock.expectOne(`${environment.apiUrl}/contacts/5`).flush(contact());
    httpMock.expectOne(`${environment.apiUrl}/deals/pipeline`).flush(pipeline());
    httpMock.expectOne((req) => req.url === `${environment.apiUrl}/activities`).flush(activitiesPage());
    fixture.detectChanges();
  }

  afterEach(() => httpMock.verify());

  it('loads the contact, linked deals, and activity feed', async () => {
    await setup();
    flushLoad();

    expect(component.contact()?.firstName).toBe('Ada');
    expect(component.linkedDeals().map((d) => d.id)).toEqual([1]);
    expect(component.activities().map((a) => a.id)).toEqual([1]);

    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('Ada Lovelace');
    expect(text).toContain('Engineer');
    expect(text).toContain('Acme Corp');
    expect(text).toContain('Acme Renewal');
    expect(text).toContain('Intro call');
  });

  it('shows an error message when loading fails', async () => {
    await setup();
    fixture.detectChanges();
    httpMock
      .expectOne(`${environment.apiUrl}/contacts/5`)
      .flush('boom', { status: 500, statusText: 'Internal Server Error' });
    httpMock.match(() => true);
    fixture.detectChanges();

    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('Something went wrong');
  });

  it('saves an inline name edit', async () => {
    await setup();
    flushLoad();

    component.startEditName();
    expect(component.editingName()).toBe(true);
    expect(component.nameForm.value).toEqual({ firstName: 'Ada', lastName: 'Lovelace' });

    component.nameForm.setValue({ firstName: 'Augusta', lastName: 'King' });
    component.saveName();

    const req = httpMock.expectOne(`${environment.apiUrl}/contacts/5`);
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual({
      firstName: 'Augusta',
      lastName: 'King',
      email: 'ada@crm.local',
      phone: '555-1234',
      title: 'Engineer',
      companyId: 1,
      ownerId: 8,
      tagIds: [1],
    });

    req.flush({ ...contact(), firstName: 'Augusta', lastName: 'King' });

    expect(component.editingName()).toBe(false);
    expect(component.contact()?.firstName).toBe('Augusta');
  });

  it('does not save an inline name edit when the form is invalid', async () => {
    await setup();
    flushLoad();

    component.startEditName();
    component.nameForm.controls.firstName.setValue('');
    component.saveName();

    expect(component.nameForm.controls.firstName.touched).toBe(true);
    httpMock.expectNone((req) => req.method === 'PUT');
  });

  it('saves an inline job title edit', async () => {
    await setup();
    flushLoad();

    component.startEditTitle();
    expect(component.editingTitle()).toBe(true);
    expect(component.titleControl.value).toBe('Engineer');

    component.titleControl.setValue('CTO');
    component.saveTitle();

    const req = httpMock.expectOne(`${environment.apiUrl}/contacts/5`);
    expect(req.request.body).toEqual(jasmine.objectContaining({ title: 'CTO' }));
    req.flush({ ...contact(), title: 'CTO' });

    expect(component.editingTitle()).toBe(false);
    expect(component.contact()?.title).toBe('CTO');
  });

  it('navigates to the edit form', async () => {
    await setup();
    flushLoad();
    spyOn(router, 'navigate');

    component.edit();
    expect(router.navigate).toHaveBeenCalledWith(['/contacts', 5, 'edit']);
  });

  it('deletes the contact after confirmation and navigates to the list', async () => {
    await setup();
    flushLoad();
    spyOn(router, 'navigate');

    spyOn(MatDialog.prototype, 'open').and.returnValue({
      afterClosed: () => of(true),
    } as unknown as MatDialogRef<ConfirmDialogComponent, boolean>);

    component.delete();

    httpMock.expectOne(`${environment.apiUrl}/contacts/5`).flush(null);
    expect(router.navigate).toHaveBeenCalledWith(['/contacts']);
  });

  it('does not delete when the confirmation is cancelled', async () => {
    await setup();
    flushLoad();

    spyOn(MatDialog.prototype, 'open').and.returnValue({
      afterClosed: () => of(false),
    } as unknown as MatDialogRef<ConfirmDialogComponent, boolean>);

    component.delete();

    httpMock.expectNone((req) => req.method === 'DELETE');
    expect(component.contact()?.id).toBe(5);
  });

  it('opens the Log Activity drawer and prepends the result to the feed', async () => {
    await setup();
    flushLoad();

    const newActivity: ActivityResponse = {
      id: 2,
      type: 'NOTE',
      subject: 'Follow-up note',
      body: null,
      contactId: 5,
      contactName: 'Ada Lovelace',
      dealId: null,
      dealTitle: null,
      createdById: 7,
      createdByName: 'Ada Lovelace',
      createdAt: '2026-01-03T00:00:00Z',
    };

    const openSpy = spyOn(MatDialog.prototype, 'open').and.returnValue({
      afterClosed: () => of(newActivity),
    } as unknown as MatDialogRef<ActivityFormDialogComponent, ActivityResponse>);

    component.logActivity();

    expect(openSpy).toHaveBeenCalledWith(ActivityFormDialogComponent, {
      data: { contactId: 5 },
      panelClass: 'drawer-panel',
    });
    expect(component.activities()[0]).toEqual(newActivity);
  });

  it('opens the Add Task drawer for this contact', async () => {
    await setup();
    flushLoad();

    const openSpy = spyOn(MatDialog.prototype, 'open').and.returnValue({
      afterClosed: () => of(undefined),
    } as unknown as MatDialogRef<TaskFormDialogComponent, TaskResponse>);

    component.addTask();

    expect(openSpy).toHaveBeenCalledWith(TaskFormDialogComponent, {
      data: { contactId: 5 },
      panelClass: 'drawer-panel',
    });
  });
});
