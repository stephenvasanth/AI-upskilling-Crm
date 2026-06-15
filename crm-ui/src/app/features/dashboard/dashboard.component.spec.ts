import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';

import { DashboardComponent } from './dashboard.component';
import { AuthService } from '../../core/services/auth.service';
import { environment } from '../../../environments/environment';
import { PipelineResponse } from '../../core/models/deal.model';
import { PageResponse } from '../../core/models/page.model';
import { TaskResponse } from '../../core/models/task.model';
import { ContactResponse } from '../../core/models/contact.model';
import { ActivityResponse } from '../../core/models/activity.model';
import { UserResponse } from '../../core/models/user.model';

describe('DashboardComponent', () => {
  let fixture: ComponentFixture<DashboardComponent>;
  let component: DashboardComponent;
  let httpMock: HttpTestingController;
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

  const pipelineResponse: PipelineResponse = {
    stages: [
      { stage: 'LEAD', count: 3, totalValue: 30000, deals: [] },
      { stage: 'QUALIFIED', count: 2, totalValue: 20000, deals: [] },
      { stage: 'PROPOSAL', count: 1, totalValue: 15000, deals: [] },
      { stage: 'NEGOTIATION', count: 0, totalValue: 0, deals: [] },
      { stage: 'CLOSED_WON', count: 5, totalValue: 50000, deals: [] },
      { stage: 'CLOSED_LOST', count: 1, totalValue: 5000, deals: [] },
    ],
  };

  function emptyPage<T>(): PageResponse<T> {
    return { content: [], page: 0, size: 0, totalElements: 0, totalPages: 0 };
  }

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DashboardComponent],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();

    httpMock = TestBed.inject(HttpTestingController);
    authService = TestBed.inject(AuthService);
    authService.setCurrentUser(baseUser);

    fixture = TestBed.createComponent(DashboardComponent);
    component = fixture.componentInstance;
  });

  afterEach(() => {
    httpMock.verify();
    localStorage.clear();
  });

  function flushInitialRequests(overrides?: {
    tasks?: PageResponse<TaskResponse>;
    contacts?: PageResponse<ContactResponse>;
    activities?: PageResponse<ActivityResponse>;
  }): void {
    fixture.detectChanges();

    httpMock.expectOne(`${environment.apiUrl}/deals/pipeline`).flush(pipelineResponse);
    httpMock.expectOne((req) => req.url === `${environment.apiUrl}/tasks`).flush(overrides?.tasks ?? emptyPage<TaskResponse>());
    httpMock
      .expectOne((req) => req.url === `${environment.apiUrl}/contacts`)
      .flush(overrides?.contacts ?? emptyPage<ContactResponse>());
    httpMock
      .expectOne((req) => req.url === `${environment.apiUrl}/activities`)
      .flush(overrides?.activities ?? emptyPage<ActivityResponse>());
  }

  it('computes open deal counts/value and the pipeline chart from the pipeline response', () => {
    flushInitialRequests();

    expect(component.loading()).toBe(false);
    expect(component.openDealsCount()).toBe(6);
    expect(component.openPipelineValue()).toBe(65000);
    expect(component.chartStages().map((s) => s.stage)).toEqual([
      'LEAD',
      'QUALIFIED',
      'PROPOSAL',
      'NEGOTIATION',
      'CLOSED_WON',
    ]);
    expect(component.maxStageCount()).toBe(5);
  });

  it('computes tasks due today and the upcoming tasks widget', () => {
    const today = new Date().toISOString().slice(0, 10);
    const tasks: TaskResponse[] = [
      {
        id: 1,
        title: 'Call Bob',
        description: null,
        dueDate: today,
        completed: false,
        contactId: null,
        contactName: null,
        dealId: null,
        dealTitle: null,
        assigneeId: 7,
        assigneeName: 'Ada Lovelace',
        createdAt: '2026-06-01T00:00:00Z',
        updatedAt: '2026-06-01T00:00:00Z',
      },
      {
        id: 2,
        title: 'Follow up',
        description: null,
        dueDate: '2026-06-20',
        completed: false,
        contactId: null,
        contactName: null,
        dealId: null,
        dealTitle: null,
        assigneeId: 7,
        assigneeName: 'Ada Lovelace',
        createdAt: '2026-06-01T00:00:00Z',
        updatedAt: '2026-06-01T00:00:00Z',
      },
    ];

    flushInitialRequests({ tasks: { content: tasks, page: 0, size: 50, totalElements: 2, totalPages: 1 } });

    expect(component.tasksDueToday()).toBe(1);
    expect(component.upcomingTasks().length).toBe(2);
  });

  it('counts contacts created within the last 7 days', () => {
    const recentContact: ContactResponse = {
      id: 1,
      firstName: 'New',
      lastName: 'Contact',
      email: null,
      phone: null,
      title: null,
      companyId: null,
      companyName: null,
      ownerId: 7,
      ownerName: 'Ada Lovelace',
      tags: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    const oldContact: ContactResponse = {
      ...recentContact,
      id: 2,
      createdAt: '2020-01-01T00:00:00Z',
      updatedAt: '2020-01-01T00:00:00Z',
    };

    flushInitialRequests({
      contacts: { content: [recentContact, oldContact], page: 0, size: 100, totalElements: 2, totalPages: 1 },
    });

    expect(component.contactsThisWeek()).toBe(1);
  });

  it('sets error when a request fails', () => {
    fixture.detectChanges();

    httpMock.expectOne(`${environment.apiUrl}/deals/pipeline`).flush('boom', {
      status: 500,
      statusText: 'Internal Server Error',
    });
    // forkJoin cancels the sibling requests once one errors; drain whatever remains open.
    httpMock.match(() => true);

    expect(component.loading()).toBe(false);
    expect(component.error()).toBe(true);
  });

  it('optimistically removes a task on completeTask and calls the toggle endpoint', () => {
    const task: TaskResponse = {
      id: 1,
      title: 'Call Bob',
      description: null,
      dueDate: '2026-06-15',
      completed: false,
      contactId: null,
      contactName: null,
      dealId: null,
      dealTitle: null,
      assigneeId: 7,
      assigneeName: 'Ada Lovelace',
      createdAt: '2026-06-01T00:00:00Z',
      updatedAt: '2026-06-01T00:00:00Z',
    };

    flushInitialRequests({ tasks: { content: [task], page: 0, size: 50, totalElements: 1, totalPages: 1 } });

    component.completeTask(task);
    expect(component.myTasks().length).toBe(0);

    const req = httpMock.expectOne(`${environment.apiUrl}/tasks/1/toggle`);
    expect(req.request.method).toBe('PATCH');
    req.flush({ ...task, completed: true });
  });
});
