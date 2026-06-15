import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { PageEvent } from '@angular/material/paginator';
import { of } from 'rxjs';

import { ActivityFeedComponent } from './activity-feed.component';
import { ActivityFormDialogComponent } from '../../../shared/activity-form-dialog/activity-form-dialog.component';
import { ConfirmDialogComponent } from '../../../shared/confirm-dialog/confirm-dialog.component';
import { environment } from '../../../../environments/environment';
import { ActivityResponse } from '../../../core/models/activity.model';
import { ContactResponse } from '../../../core/models/contact.model';
import { PageResponse } from '../../../core/models/page.model';

describe('ActivityFeedComponent', () => {
  let fixture: ComponentFixture<ActivityFeedComponent>;
  let component: ActivityFeedComponent;
  let httpMock: HttpTestingController;

  function activity(overrides: Partial<ActivityResponse> = {}): ActivityResponse {
    return {
      id: 1,
      type: 'CALL',
      subject: 'Intro call',
      body: 'Discussed pricing options at length to determine fit.',
      contactId: 5,
      contactName: 'Ada Lovelace',
      dealId: null,
      dealTitle: null,
      createdById: 7,
      createdByName: 'Grace Hopper',
      createdAt: new Date().toISOString(),
      ...overrides,
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

  function activityPage(content: ActivityResponse[], totalElements = content.length): PageResponse<ActivityResponse> {
    return { content, page: 0, size: 20, totalElements, totalPages: 1 };
  }

  function contactPage(content: ContactResponse[]): PageResponse<ContactResponse> {
    return { content, page: 0, size: 100, totalElements: content.length, totalPages: 1 };
  }

  async function setup(): Promise<void> {
    await TestBed.configureTestingModule({
      imports: [ActivityFeedComponent],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();

    httpMock = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(ActivityFeedComponent);
    component = fixture.componentInstance;
  }

  /** Flushes the initial activities and contacts requests fired by `ngOnInit`. */
  function flushInit(activities: ActivityResponse[] = [activity()], contacts: ContactResponse[] = [contact()]): void {
    fixture.detectChanges();
    httpMock.expectOne((req) => req.url === `${environment.apiUrl}/activities`).flush(activityPage(activities));
    httpMock.expectOne((req) => req.url === `${environment.apiUrl}/contacts`).flush(contactPage(contacts));
    fixture.detectChanges();
  }

  afterEach(() => httpMock.verify());

  it('loads and displays a page of activities', async () => {
    await setup();
    flushInit();

    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('Intro call');
    expect(text).toContain('Discussed pricing');
    expect(text).toContain('Ada Lovelace');
    expect(text).toContain('Grace Hopper');
    expect(text).toContain('Today at');
  });

  it('shows the empty state when there are no activities', async () => {
    await setup();
    flushInit([]);

    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('No activity yet');
  });

  it('shows an error message when loading fails', async () => {
    await setup();
    fixture.detectChanges();
    httpMock
      .expectOne((req) => req.url === `${environment.apiUrl}/activities`)
      .flush('boom', { status: 500, statusText: 'Internal Server Error' });
    httpMock.expectOne((req) => req.url === `${environment.apiUrl}/contacts`).flush(contactPage([]));
    fixture.detectChanges();

    expect(component.error()).toBe(true);
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('Something went wrong');
  });

  it('filters activities by type client-side without an additional request', async () => {
    await setup();
    flushInit([
      activity({ id: 1, type: 'CALL', subject: 'Call subject' }),
      activity({ id: 2, type: 'EMAIL', subject: 'Email subject' }),
    ]);

    component.typeFilter.setValue('EMAIL');

    expect(component.filteredActivities().map((a) => a.id)).toEqual([2]);
    httpMock.expectNone((req) => req.url === `${environment.apiUrl}/activities`);
  });

  it('reloads from page 0 with the contactId param when the contact filter changes', async () => {
    await setup();
    flushInit();

    component.page.set(2);
    component.contactFilter.setValue(5);

    const req = httpMock.expectOne((req) => req.url === `${environment.apiUrl}/activities`);
    expect(req.request.params.get('contactId')).toBe('5');
    expect(req.request.params.get('page')).toBe('0');
    req.flush(activityPage([]));
  });

  it('reloads with the new page on paginator change', async () => {
    await setup();
    flushInit();

    component.onPageChange({ pageIndex: 1, pageSize: 10, length: 0 } as PageEvent);

    const req = httpMock.expectOne((req) => req.url === `${environment.apiUrl}/activities`);
    expect(req.request.params.get('page')).toBe('1');
    expect(req.request.params.get('size')).toBe('10');
    req.flush(activityPage([]));
  });

  it('opens the Log Activity drawer and reloads on result', async () => {
    await setup();
    flushInit();

    const openSpy = spyOn(MatDialog.prototype, 'open').and.returnValue({
      afterClosed: () => of(activity({ id: 99 })),
    } as unknown as MatDialogRef<ActivityFormDialogComponent, ActivityResponse>);

    component.logActivity();

    expect(openSpy).toHaveBeenCalledWith(ActivityFormDialogComponent, { data: {}, panelClass: 'drawer-panel' });
    httpMock.expectOne((req) => req.url === `${environment.apiUrl}/activities`).flush(activityPage([]));
  });

  it('does not reload when the Log Activity drawer is cancelled', async () => {
    await setup();
    flushInit();

    spyOn(MatDialog.prototype, 'open').and.returnValue({
      afterClosed: () => of(undefined),
    } as unknown as MatDialogRef<ActivityFormDialogComponent, ActivityResponse>);

    component.logActivity();

    httpMock.expectNone((req) => req.url === `${environment.apiUrl}/activities`);
    expect(component.activities().length).toBe(1);
  });

  it('deletes an activity after confirmation and reloads', async () => {
    await setup();
    flushInit();

    spyOn(MatDialog.prototype, 'open').and.returnValue({
      afterClosed: () => of(true),
    } as unknown as MatDialogRef<ConfirmDialogComponent, boolean>);

    component.delete(component.activities()[0]);

    httpMock.expectOne((req) => req.method === 'DELETE' && req.url === `${environment.apiUrl}/activities/1`).flush(null);
    httpMock.expectOne((req) => req.url === `${environment.apiUrl}/activities`).flush(activityPage([]));

    expect(component.activities().length).toBe(0);
  });

  it('does not delete when the confirmation is cancelled', async () => {
    await setup();
    flushInit();

    spyOn(MatDialog.prototype, 'open').and.returnValue({
      afterClosed: () => of(false),
    } as unknown as MatDialogRef<ConfirmDialogComponent, boolean>);

    component.delete(component.activities()[0]);

    httpMock.expectNone((req) => req.method === 'DELETE');
    expect(component.activities().length).toBe(1);
  });
});
