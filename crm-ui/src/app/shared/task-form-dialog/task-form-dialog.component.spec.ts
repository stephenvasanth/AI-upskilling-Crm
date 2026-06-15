import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { MAT_DIALOG_DATA, MatDialog, MatDialogRef } from '@angular/material/dialog';
import { of } from 'rxjs';

import { TaskFormDialogComponent, TaskFormDialogData, TaskFormDialogResult } from './task-form-dialog.component';
import { AuthService } from '../../core/services/auth.service';
import { ConfirmDialogComponent } from '../confirm-dialog/confirm-dialog.component';
import { environment } from '../../../environments/environment';
import { ContactResponse } from '../../core/models/contact.model';
import { DealResponse, PipelineResponse } from '../../core/models/deal.model';
import { TaskResponse } from '../../core/models/task.model';
import { UserResponse } from '../../core/models/user.model';

describe('TaskFormDialogComponent', () => {
  let fixture: ComponentFixture<TaskFormDialogComponent>;
  let component: TaskFormDialogComponent;
  let httpMock: HttpTestingController;
  let dialogRef: jasmine.SpyObj<MatDialogRef<TaskFormDialogComponent, TaskFormDialogResult>>;

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

  function task(): TaskResponse {
    return {
      id: 1,
      title: 'Follow up',
      description: null,
      dueDate: '2026-06-20',
      completed: false,
      contactId: 5,
      contactName: 'Ada Lovelace',
      dealId: null,
      dealTitle: null,
      assigneeId: 7,
      assigneeName: 'Ada Lovelace',
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
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

  async function setup(data: TaskFormDialogData = { contactId: 5 }): Promise<void> {
    dialogRef = jasmine.createSpyObj('MatDialogRef', ['close']);

    await TestBed.configureTestingModule({
      imports: [TaskFormDialogComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: MAT_DIALOG_DATA, useValue: data },
        { provide: MatDialogRef, useValue: dialogRef },
      ],
    }).compileComponents();

    httpMock = TestBed.inject(HttpTestingController);
    TestBed.inject(AuthService).setCurrentUser(currentUser);

    fixture = TestBed.createComponent(TaskFormDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }

  /** Flushes the users/contacts/deals requests fired by `ngOnInit`. */
  function flushFormData(contacts: ContactResponse[] = [contact()], deals: DealResponse[] = [deal()]): void {
    httpMock.expectOne(`${environment.apiUrl}/users`).flush(users);

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

  afterEach(() => {
    httpMock.verify();
    localStorage.clear();
  });

  it('defaults the assignee to the current user once users load', async () => {
    await setup();
    flushFormData();

    expect(component.loading()).toBe(false);
    expect(component.users()).toEqual(users);
    expect(component.form.controls.assigneeId.value).toBe(7);
  });

  it('blocks submit when the title is missing', async () => {
    await setup();
    flushFormData();

    component.submit();

    expect(component.form.controls.title.touched).toBe(true);
    httpMock.expectNone(`${environment.apiUrl}/tasks`);
    expect(dialogRef.close).not.toHaveBeenCalled();
  });

  it('creates the task linked to the given contact and closes with the result', async () => {
    await setup({ contactId: 5 });
    flushFormData();

    component.form.patchValue({ title: 'Follow up', dueDate: '2026-06-20' });
    component.submit();

    const req = httpMock.expectOne(`${environment.apiUrl}/tasks`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({
      title: 'Follow up',
      description: null,
      dueDate: '2026-06-20',
      assigneeId: 7,
      contactId: 5,
      dealId: null,
    });

    req.flush(task());

    expect(dialogRef.close).toHaveBeenCalledWith(task());
    expect(component.saving()).toBe(false);
  });

  it('shows an error message if saving the task fails', async () => {
    await setup();
    flushFormData();

    component.form.patchValue({ title: 'Follow up' });
    component.submit();

    httpMock
      .expectOne(`${environment.apiUrl}/tasks`)
      .flush('boom', { status: 500, statusText: 'Internal Server Error' });

    expect(component.saving()).toBe(false);
    expect(component.error()).toBe('Something went wrong saving this task. Please try again.');
    expect(dialogRef.close).not.toHaveBeenCalled();
  });

  it('cancel closes the dialog without saving', async () => {
    await setup();
    flushFormData();

    component.cancel();

    expect(dialogRef.close).toHaveBeenCalledWith();
    httpMock.expectNone(`${environment.apiUrl}/tasks`);
  });

  it('resolves contactId/dealId from the picker search text', async () => {
    await setup({});
    flushFormData();

    component.contactInput.setValue('Ada Lovelace');
    expect(component.form.controls.contactId.value).toBe(5);

    component.dealInput.setValue('Big Deal');
    expect(component.form.controls.dealId.value).toBe(9);

    component.contactInput.setValue('nobody');
    expect(component.form.controls.contactId.value).toBeNull();
  });

  it('pre-fills the form from the task in edit mode', async () => {
    await setup({ task: task() });
    flushFormData();

    expect(component.isEditMode()).toBe(true);
    expect(component.form.controls.title.value).toBe('Follow up');
    expect(component.form.controls.dueDate.value).toBe('2026-06-20');
    expect(component.form.controls.assigneeId.value).toBe(7);
    expect(component.form.controls.contactId.value).toBe(5);
    expect(component.contactInput.value).toBe('Ada Lovelace');

    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('Edit Task');
  });

  it('updates the task and closes with the result in edit mode', async () => {
    await setup({ task: task() });
    flushFormData();

    component.form.patchValue({ title: 'Follow up (updated)' });
    component.submit();

    const req = httpMock.expectOne(`${environment.apiUrl}/tasks/1`);
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual({
      title: 'Follow up (updated)',
      description: null,
      dueDate: '2026-06-20',
      assigneeId: 7,
      contactId: 5,
      dealId: null,
    });

    const updated = { ...task(), title: 'Follow up (updated)' };
    req.flush(updated);

    expect(dialogRef.close).toHaveBeenCalledWith(updated);
  });

  it('deletes the task after confirmation and closes with "deleted"', async () => {
    await setup({ task: task() });
    flushFormData();

    spyOn(MatDialog.prototype, 'open').and.returnValue({
      afterClosed: () => of(true),
    } as unknown as MatDialogRef<ConfirmDialogComponent, boolean>);

    component.delete();

    httpMock.expectOne((req) => req.method === 'DELETE' && req.url === `${environment.apiUrl}/tasks/1`).flush(null);

    expect(dialogRef.close).toHaveBeenCalledWith('deleted');
  });

  it('does not delete when the confirmation is cancelled', async () => {
    await setup({ task: task() });
    flushFormData();

    spyOn(MatDialog.prototype, 'open').and.returnValue({
      afterClosed: () => of(false),
    } as unknown as MatDialogRef<ConfirmDialogComponent, boolean>);

    component.delete();

    httpMock.expectNone((req) => req.method === 'DELETE');
    expect(dialogRef.close).not.toHaveBeenCalledWith('deleted');
  });
});
