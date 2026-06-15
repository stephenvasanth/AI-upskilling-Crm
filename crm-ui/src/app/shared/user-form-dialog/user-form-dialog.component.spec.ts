import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';

import { UserFormDialogComponent, UserFormDialogData } from './user-form-dialog.component';
import { environment } from '../../../environments/environment';
import { UserResponse } from '../../core/models/user.model';

describe('UserFormDialogComponent', () => {
  let fixture: ComponentFixture<UserFormDialogComponent>;
  let component: UserFormDialogComponent;
  let httpMock: HttpTestingController;
  let dialogRef: jasmine.SpyObj<MatDialogRef<UserFormDialogComponent, UserResponse | undefined>>;

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

  async function setup(data: UserFormDialogData = {}): Promise<void> {
    dialogRef = jasmine.createSpyObj('MatDialogRef', ['close']);

    await TestBed.configureTestingModule({
      imports: [UserFormDialogComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: MAT_DIALOG_DATA, useValue: data },
        { provide: MatDialogRef, useValue: dialogRef },
      ],
    }).compileComponents();

    httpMock = TestBed.inject(HttpTestingController);

    fixture = TestBed.createComponent(UserFormDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }

  afterEach(() => httpMock.verify());

  it('defaults to Invite User with an empty form', async () => {
    await setup();

    expect(component.isEditMode()).toBe(false);
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('Invite User');
  });

  it('blocks submit when required fields are missing', async () => {
    await setup();

    component.submit();

    expect(component.form.controls.email.touched).toBe(true);
    httpMock.expectNone(`${environment.apiUrl}/auth/register`);
    expect(dialogRef.close).not.toHaveBeenCalled();
  });

  it('invites a new user and closes with the result', async () => {
    await setup();

    component.form.setValue({
      firstName: 'Ada',
      lastName: 'Lovelace',
      email: 'ada@crm.local',
      password: 'password123',
      role: 'ADMIN',
      active: true,
    });
    component.submit();

    const req = httpMock.expectOne(`${environment.apiUrl}/auth/register`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({
      firstName: 'Ada',
      lastName: 'Lovelace',
      email: 'ada@crm.local',
      password: 'password123',
      role: 'ADMIN',
    });

    const created = user({ id: 99, firstName: 'Ada', lastName: 'Lovelace', email: 'ada@crm.local', role: 'ADMIN' });
    req.flush(created);

    expect(dialogRef.close).toHaveBeenCalledWith(created);
    expect(component.saving()).toBe(false);
  });

  it('shows a conflict-specific error when the email is already registered', async () => {
    await setup();

    component.form.setValue({
      firstName: 'Ada',
      lastName: 'Lovelace',
      email: 'ada@crm.local',
      password: 'password123',
      role: 'USER',
      active: true,
    });
    component.submit();

    httpMock.expectOne(`${environment.apiUrl}/auth/register`).flush('boom', { status: 409, statusText: 'Conflict' });

    expect(component.error()).toBe('A user with this email already exists.');
    expect(dialogRef.close).not.toHaveBeenCalled();
  });

  it('pre-fills the form in edit mode and disables the email field', async () => {
    await setup({ user: user() });

    expect(component.isEditMode()).toBe(true);
    expect(component.form.controls.firstName.value).toBe('Grace');
    expect(component.form.controls.email.disabled).toBe(true);

    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('Edit User');
  });

  it('updates the user and closes with the result in edit mode', async () => {
    await setup({ user: user() });

    component.form.patchValue({ role: 'ADMIN', active: false });
    component.submit();

    const req = httpMock.expectOne(`${environment.apiUrl}/users/7`);
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual({
      firstName: 'Grace',
      lastName: 'Hopper',
      password: null,
      role: 'ADMIN',
      active: false,
    });

    const updated = user({ role: 'ADMIN', active: false });
    req.flush(updated);

    expect(dialogRef.close).toHaveBeenCalledWith(updated);
  });

  it('allows leaving the password blank in edit mode', async () => {
    await setup({ user: user() });

    component.submit();

    httpMock.expectOne(`${environment.apiUrl}/users/7`).flush(user());
    expect(dialogRef.close).toHaveBeenCalledWith(user());
  });

  it('rejects a too-short password in edit mode', async () => {
    await setup({ user: user() });

    component.form.controls.password.setValue('short');
    component.submit();

    expect(component.form.controls.password.hasError('minlength')).toBe(true);
    httpMock.expectNone(`${environment.apiUrl}/users/7`);
  });

  it('cancel closes the dialog without saving', async () => {
    await setup();

    component.cancel();

    expect(dialogRef.close).toHaveBeenCalledWith();
  });
});
