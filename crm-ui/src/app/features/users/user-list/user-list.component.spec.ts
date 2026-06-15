import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { of } from 'rxjs';

import { UserListComponent } from './user-list.component';
import { ConfirmDialogComponent } from '../../../shared/confirm-dialog/confirm-dialog.component';
import { UserFormDialogComponent } from '../../../shared/user-form-dialog/user-form-dialog.component';
import { environment } from '../../../../environments/environment';
import { UserResponse } from '../../../core/models/user.model';

describe('UserListComponent', () => {
  let fixture: ComponentFixture<UserListComponent>;
  let component: UserListComponent;
  let httpMock: HttpTestingController;

  function user(overrides: Partial<UserResponse> = {}): UserResponse {
    return {
      id: 7,
      firstName: 'Grace',
      lastName: 'Hopper',
      email: 'grace@crm.local',
      role: 'USER',
      active: true,
      createdAt: '2026-01-01T00:00:00Z',
      ...overrides,
    };
  }

  async function setup(): Promise<void> {
    await TestBed.configureTestingModule({
      imports: [UserListComponent],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();

    httpMock = TestBed.inject(HttpTestingController);

    fixture = TestBed.createComponent(UserListComponent);
    component = fixture.componentInstance;
  }

  /** Flushes the initial users request fired by `ngOnInit`. */
  function flushInit(users: UserResponse[] = [user()]): void {
    fixture.detectChanges();
    httpMock.expectOne(`${environment.apiUrl}/users`).flush(users);
    fixture.detectChanges();
  }

  afterEach(() => httpMock.verify());

  it('loads and displays the team members', async () => {
    await setup();
    flushInit([user({ firstName: 'Ada', lastName: 'Lovelace', email: 'ada@crm.local', role: 'ADMIN' })]);

    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('Ada Lovelace');
    expect(text).toContain('ada@crm.local');
    expect(text).toContain('ADMIN');
  });

  it('shows the empty state when there are no users', async () => {
    await setup();
    flushInit([]);

    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('No team members yet');
  });

  it('shows an error message when loading fails', async () => {
    await setup();
    fixture.detectChanges();
    httpMock.expectOne(`${environment.apiUrl}/users`).flush('boom', { status: 500, statusText: 'Internal Server Error' });
    fixture.detectChanges();

    expect(component.error()).toBe(true);
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('Something went wrong');
  });

  it('opens the Invite User drawer and reloads on result', async () => {
    await setup();
    flushInit();

    const openSpy = spyOn(MatDialog.prototype, 'open').and.returnValue({
      afterClosed: () => of(user({ id: 99 })),
    } as unknown as MatDialogRef<UserFormDialogComponent, UserResponse>);

    component.inviteUser();

    expect(openSpy).toHaveBeenCalledWith(UserFormDialogComponent, { data: {}, panelClass: 'drawer-panel' });
    httpMock.expectOne(`${environment.apiUrl}/users`).flush([user(), user({ id: 99 })]);
  });

  it('opens the Edit User drawer for a user and reloads on result', async () => {
    await setup();
    flushInit();

    const existingUser = component.users()[0];
    const openSpy = spyOn(MatDialog.prototype, 'open').and.returnValue({
      afterClosed: () => of({ ...existingUser, role: 'ADMIN' }),
    } as unknown as MatDialogRef<UserFormDialogComponent, UserResponse>);

    component.editUser(existingUser);

    expect(openSpy).toHaveBeenCalledWith(UserFormDialogComponent, {
      data: { user: existingUser },
      panelClass: 'drawer-panel',
    });
    httpMock.expectOne(`${environment.apiUrl}/users`).flush([{ ...existingUser, role: 'ADMIN' }]);
  });

  it('deactivates a user after confirmation and reloads', async () => {
    await setup();
    flushInit([user({ active: true })]);

    spyOn(MatDialog.prototype, 'open').and.returnValue({
      afterClosed: () => of(true),
    } as unknown as MatDialogRef<ConfirmDialogComponent, boolean>);

    component.toggleActive(component.users()[0]);

    const req = httpMock.expectOne(`${environment.apiUrl}/users/7`);
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual({
      firstName: 'Grace',
      lastName: 'Hopper',
      password: null,
      role: 'USER',
      active: false,
    });
    req.flush(user({ active: false }));

    httpMock.expectOne(`${environment.apiUrl}/users`).flush([user({ active: false })]);
  });

  it('does not change active status when the confirmation is cancelled', async () => {
    await setup();
    flushInit([user({ active: true })]);

    spyOn(MatDialog.prototype, 'open').and.returnValue({
      afterClosed: () => of(false),
    } as unknown as MatDialogRef<ConfirmDialogComponent, boolean>);

    component.toggleActive(component.users()[0]);

    expect(component.users()[0].active).toBe(true);
    httpMock.expectNone((req) => req.method === 'PUT');
  });
});
