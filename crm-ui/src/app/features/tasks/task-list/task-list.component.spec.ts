import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { PageEvent } from '@angular/material/paginator';
import { of } from 'rxjs';

import { TaskListComponent } from './task-list.component';
import { AuthService } from '../../../core/services/auth.service';
import { ConfirmDialogComponent } from '../../../shared/confirm-dialog/confirm-dialog.component';
import { TaskFormDialogComponent } from '../../../shared/task-form-dialog/task-form-dialog.component';
import { environment } from '../../../../environments/environment';
import { PageResponse } from '../../../core/models/page.model';
import { TaskResponse } from '../../../core/models/task.model';
import { UserResponse } from '../../../core/models/user.model';

describe('TaskListComponent', () => {
  let fixture: ComponentFixture<TaskListComponent>;
  let component: TaskListComponent;
  let httpMock: HttpTestingController;

  const currentUser: UserResponse = {
    id: 7,
    firstName: 'Grace',
    lastName: 'Hopper',
    email: 'grace@crm.local',
    role: 'USER',
    active: true,
    createdAt: '2026-01-01T00:00:00Z',
  };

  /** Today's date offset by `offsetDays`, as an ISO `YYYY-MM-DD` string. */
  function isoDate(offsetDays: number): string {
    const date = new Date();
    date.setDate(date.getDate() + offsetDays);
    return date.toISOString().slice(0, 10);
  }

  function task(overrides: Partial<TaskResponse> = {}): TaskResponse {
    return {
      id: 1,
      title: 'Follow up',
      description: null,
      dueDate: isoDate(0),
      completed: false,
      contactId: 5,
      contactName: 'Ada Lovelace',
      dealId: null,
      dealTitle: null,
      assigneeId: 7,
      assigneeName: 'Grace Hopper',
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
      ...overrides,
    };
  }

  function taskPage(content: TaskResponse[], totalElements = content.length): PageResponse<TaskResponse> {
    return { content, page: 0, size: 20, totalElements, totalPages: 1 };
  }

  async function setup(): Promise<void> {
    await TestBed.configureTestingModule({
      imports: [TaskListComponent],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();

    httpMock = TestBed.inject(HttpTestingController);
    TestBed.inject(AuthService).setCurrentUser(currentUser);

    fixture = TestBed.createComponent(TaskListComponent);
    component = fixture.componentInstance;
  }

  /** Flushes the initial tasks request fired by `ngOnInit`. */
  function flushInit(tasks: TaskResponse[] = [task()], totalElements = tasks.length): void {
    fixture.detectChanges();
    httpMock.expectOne((req) => req.url === `${environment.apiUrl}/tasks`).flush(taskPage(tasks, totalElements));
    fixture.detectChanges();
  }

  afterEach(() => {
    httpMock.verify();
    localStorage.clear();
  });

  it('loads and displays a page of tasks', async () => {
    await setup();
    flushInit([task({ title: 'Follow up with Ada' })]);

    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('Follow up with Ada');
    expect(text).toContain('Ada Lovelace');
    expect(text).toContain('Grace Hopper');
  });

  it('shows the empty state when there are no tasks', async () => {
    await setup();
    flushInit([]);

    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('No tasks here');
  });

  it('shows an error message when loading fails', async () => {
    await setup();
    fixture.detectChanges();
    httpMock
      .expectOne((req) => req.url === `${environment.apiUrl}/tasks`)
      .flush('boom', { status: 500, statusText: 'Internal Server Error' });
    fixture.detectChanges();

    expect(component.error()).toBe(true);
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('Something went wrong');
  });

  it("requests the current user's tasks when the My Tasks tab is selected", async () => {
    await setup();
    flushInit();

    component.page.set(2);
    component.selectFilter('mine');

    const req = httpMock.expectOne((req) => req.url === `${environment.apiUrl}/tasks`);
    expect(req.request.params.get('assigneeId')).toBe('7');
    expect(req.request.params.get('page')).toBe('0');
    expect(req.request.params.has('completed')).toBe(false);
    req.flush(taskPage([]));
  });

  it('requests completed tasks when the Completed tab is selected', async () => {
    await setup();
    flushInit();

    component.selectFilter('completed');

    const req = httpMock.expectOne((req) => req.url === `${environment.apiUrl}/tasks`);
    expect(req.request.params.get('completed')).toBe('true');
    req.flush(taskPage([]));
  });

  it('filters overdue tasks client-side from the incomplete tasks page', async () => {
    await setup();
    flushInit();

    component.selectFilter('overdue');

    const req = httpMock.expectOne((req) => req.url === `${environment.apiUrl}/tasks`);
    expect(req.request.params.get('completed')).toBe('false');

    req.flush(
      taskPage([
        task({ id: 1, title: 'Overdue task', dueDate: isoDate(-1) }),
        task({ id: 2, title: 'Due today task', dueDate: isoDate(0) }),
        task({ id: 3, title: 'Upcoming task', dueDate: isoDate(1) }),
      ]),
    );

    expect(component.filteredTasks().map((t) => t.id)).toEqual([1]);
  });

  it('reloads with the new page on paginator change', async () => {
    await setup();
    flushInit();

    component.onPageChange({ pageIndex: 1, pageSize: 10, length: 0 } as PageEvent);

    const req = httpMock.expectOne((req) => req.url === `${environment.apiUrl}/tasks`);
    expect(req.request.params.get('page')).toBe('1');
    expect(req.request.params.get('size')).toBe('10');
    req.flush(taskPage([]));
  });

  it('toggles a task optimistically and calls the toggle endpoint', async () => {
    await setup();
    flushInit([task({ id: 1, completed: false })]);

    component.toggleTask(component.tasks()[0]);

    expect(component.tasks()[0].completed).toBe(true);
    httpMock
      .expectOne((req) => req.method === 'PATCH' && req.url === `${environment.apiUrl}/tasks/1/toggle`)
      .flush(task({ id: 1, completed: true }));
  });

  it('reverts the toggle if the request fails', async () => {
    await setup();
    flushInit([task({ id: 1, completed: false })]);

    component.toggleTask(component.tasks()[0]);
    expect(component.tasks()[0].completed).toBe(true);

    httpMock
      .expectOne((req) => req.method === 'PATCH' && req.url === `${environment.apiUrl}/tasks/1/toggle`)
      .flush('boom', { status: 500, statusText: 'Internal Server Error' });

    expect(component.tasks()[0].completed).toBe(false);
  });

  it('opens the Add Task drawer and reloads on result', async () => {
    await setup();
    flushInit();

    const openSpy = spyOn(MatDialog.prototype, 'open').and.returnValue({
      afterClosed: () => of(task({ id: 99 })),
    } as unknown as MatDialogRef<TaskFormDialogComponent, TaskResponse>);

    component.addTask();

    expect(openSpy).toHaveBeenCalledWith(TaskFormDialogComponent, { data: {}, panelClass: 'drawer-panel' });
    httpMock.expectOne((req) => req.url === `${environment.apiUrl}/tasks`).flush(taskPage([]));
  });

  it('opens the Edit Task drawer for a task and reloads on result', async () => {
    await setup();
    flushInit();

    const existingTask = component.tasks()[0];
    const openSpy = spyOn(MatDialog.prototype, 'open').and.returnValue({
      afterClosed: () => of({ ...existingTask, title: 'Updated' }),
    } as unknown as MatDialogRef<TaskFormDialogComponent, TaskResponse>);

    component.editTask(existingTask);

    expect(openSpy).toHaveBeenCalledWith(TaskFormDialogComponent, {
      data: { task: existingTask },
      panelClass: 'drawer-panel',
    });
    httpMock.expectOne((req) => req.url === `${environment.apiUrl}/tasks`).flush(taskPage([]));
  });

  it('deletes a task after confirmation and reloads', async () => {
    await setup();
    flushInit();

    spyOn(MatDialog.prototype, 'open').and.returnValue({
      afterClosed: () => of(true),
    } as unknown as MatDialogRef<ConfirmDialogComponent, boolean>);

    component.deleteTask(component.tasks()[0]);

    httpMock.expectOne((req) => req.method === 'DELETE' && req.url === `${environment.apiUrl}/tasks/1`).flush(null);
    httpMock.expectOne((req) => req.url === `${environment.apiUrl}/tasks`).flush(taskPage([]));

    expect(component.tasks().length).toBe(0);
  });

  it('does not delete when the confirmation is cancelled', async () => {
    await setup();
    flushInit();

    spyOn(MatDialog.prototype, 'open').and.returnValue({
      afterClosed: () => of(false),
    } as unknown as MatDialogRef<ConfirmDialogComponent, boolean>);

    component.deleteTask(component.tasks()[0]);

    httpMock.expectNone((req) => req.method === 'DELETE');
    expect(component.tasks().length).toBe(1);
  });
});
