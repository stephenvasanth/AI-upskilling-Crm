import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter, Router } from '@angular/router';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { PageEvent } from '@angular/material/paginator';
import { of } from 'rxjs';

import { ContactListComponent } from './contact-list.component';
import { ConfirmDialogComponent } from '../../../shared/confirm-dialog/confirm-dialog.component';
import { environment } from '../../../../environments/environment';
import { ContactResponse } from '../../../core/models/contact.model';
import { PageResponse } from '../../../core/models/page.model';
import { TagResponse } from '../../../core/models/tag.model';

describe('ContactListComponent', () => {
  let fixture: ComponentFixture<ContactListComponent>;
  let component: ContactListComponent;
  let httpMock: HttpTestingController;
  let router: Router;

  function tag(id: number, name: string): TagResponse {
    return { id, name, color: '#4F46E5' };
  }

  function contact(overrides: Partial<ContactResponse> = {}): ContactResponse {
    return {
      id: 1,
      firstName: 'Ada',
      lastName: 'Lovelace',
      email: 'ada@crm.local',
      phone: '555-1234',
      title: 'Engineer',
      companyId: 1,
      companyName: 'Acme',
      ownerId: 2,
      ownerName: 'Grace Hopper',
      tags: [],
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
      ...overrides,
    };
  }

  function page(content: ContactResponse[], totalElements = content.length): PageResponse<ContactResponse> {
    return { content, page: 0, size: 20, totalElements, totalPages: 1 };
  }

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ContactListComponent],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();

    httpMock = TestBed.inject(HttpTestingController);
    router = TestBed.inject(Router);

    fixture = TestBed.createComponent(ContactListComponent);
    component = fixture.componentInstance;
  });

  afterEach(() => httpMock.verify());

  function flushContacts(result: PageResponse<ContactResponse>): void {
    fixture.detectChanges();
    httpMock.expectOne((req) => req.url === `${environment.apiUrl}/contacts`).flush(result);
    fixture.detectChanges();
  }

  it('loads and displays a page of contacts', () => {
    flushContacts(page([contact()]));

    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('Ada Lovelace');
    expect(text).toContain('Acme');
    expect(text).toContain('ada@crm.local');
  });

  it('shows the empty state when there are no contacts', () => {
    flushContacts(page([]));

    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('No contacts yet');
  });

  it('shows an error message when the request fails', () => {
    fixture.detectChanges();
    httpMock
      .expectOne((req) => req.url === `${environment.apiUrl}/contacts`)
      .flush('boom', { status: 500, statusText: 'Internal Server Error' });
    fixture.detectChanges();

    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('Something went wrong');
  });

  it('debounces search input and reloads from page 0', fakeAsync(() => {
    flushContacts(page([contact()]));

    component.searchControl.setValue('grace');
    tick(300);

    const req = httpMock.expectOne((r) => r.url === `${environment.apiUrl}/contacts`);
    expect(req.request.params.get('search')).toBe('grace');
    req.flush(page([]));
  }));

  it('reloads with the new page index and size on pagination', () => {
    flushContacts(page([contact()], 50));

    component.onPageChange({ pageIndex: 1, pageSize: 10, length: 50 } as PageEvent);

    const req = httpMock.expectOne((r) => r.url === `${environment.apiUrl}/contacts`);
    expect(req.request.params.get('page')).toBe('1');
    expect(req.request.params.get('size')).toBe('10');
    req.flush(page([], 50));
  });

  it('limits tag chips to 3 with an overflow badge', () => {
    const manyTags = [tag(1, 'A'), tag(2, 'B'), tag(3, 'C'), tag(4, 'D')];
    flushContacts(page([contact({ tags: manyTags })]));

    expect(component.visibleTags(component.contacts()[0]).length).toBe(3);
    expect(component.overflowCount(component.contacts()[0])).toBe(1);
  });

  it('navigates to the contact detail page on row click', () => {
    flushContacts(page([contact()]));
    spyOn(router, 'navigate');

    component.openContact(component.contacts()[0]);
    expect(router.navigate).toHaveBeenCalledWith(['/contacts', 1]);
  });

  it('navigates to the edit form and stops propagation', () => {
    flushContacts(page([contact()]));
    spyOn(router, 'navigate');
    const event = new Event('click');
    spyOn(event, 'stopPropagation');

    component.edit(component.contacts()[0], event);

    expect(event.stopPropagation).toHaveBeenCalled();
    expect(router.navigate).toHaveBeenCalledWith(['/contacts', 1, 'edit']);
  });

  it('deletes a contact after confirmation and reloads', () => {
    flushContacts(page([contact()]));

    spyOn(MatDialog.prototype, 'open').and.returnValue({
      afterClosed: () => of(true),
    } as unknown as MatDialogRef<ConfirmDialogComponent, boolean>);

    component.delete(component.contacts()[0], new Event('click'));

    httpMock.expectOne(`${environment.apiUrl}/contacts/1`).flush(null);
    httpMock.expectOne((r) => r.url === `${environment.apiUrl}/contacts`).flush(page([]));

    expect(component.contacts().length).toBe(0);
  });

  it('does not delete when the confirmation is cancelled', () => {
    flushContacts(page([contact()]));

    spyOn(MatDialog.prototype, 'open').and.returnValue({
      afterClosed: () => of(false),
    } as unknown as MatDialogRef<ConfirmDialogComponent, boolean>);

    component.delete(component.contacts()[0], new Event('click'));

    httpMock.expectNone(`${environment.apiUrl}/contacts/1`);
    expect(component.contacts().length).toBe(1);
  });
});
