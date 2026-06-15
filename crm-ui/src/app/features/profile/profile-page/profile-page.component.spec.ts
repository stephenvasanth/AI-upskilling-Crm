import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';

import { ProfilePageComponent } from './profile-page.component';
import { AuthService } from '../../../core/services/auth.service';
import { environment } from '../../../../environments/environment';
import { UserResponse } from '../../../core/models/user.model';

describe('ProfilePageComponent', () => {
  let fixture: ComponentFixture<ProfilePageComponent>;
  let component: ProfilePageComponent;
  let httpMock: HttpTestingController;
  let authService: AuthService;

  function user(overrides: Partial<UserResponse> = {}): UserResponse {
    return {
      id: 7,
      firstName: 'Grace',
      lastName: 'Hopper',
      email: 'grace@crm.local',
      role: 'ADMIN',
      active: true,
      createdAt: '2026-01-01T00:00:00Z',
      ...overrides,
    };
  }

  async function setup(): Promise<void> {
    await TestBed.configureTestingModule({
      imports: [ProfilePageComponent],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();

    httpMock = TestBed.inject(HttpTestingController);
    authService = TestBed.inject(AuthService);

    fixture = TestBed.createComponent(ProfilePageComponent);
    component = fixture.componentInstance;
  }

  /** Flushes the initial profile request fired by `ngOnInit`. */
  function flushInit(profile: UserResponse = user()): void {
    fixture.detectChanges();
    httpMock.expectOne(`${environment.apiUrl}/users/me`).flush(profile);
    fixture.detectChanges();
  }

  afterEach(() => {
    httpMock.verify();
    localStorage.clear();
  });

  it('loads and displays the current profile', async () => {
    await setup();
    flushInit();

    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('Grace Hopper');
    expect(text).toContain('grace@crm.local');
    expect(text).toContain('ADMIN');
  });

  it('shows an error message when loading fails', async () => {
    await setup();
    fixture.detectChanges();
    httpMock.expectOne(`${environment.apiUrl}/users/me`).flush('boom', { status: 500, statusText: 'Internal Server Error' });
    fixture.detectChanges();

    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('Something went wrong loading your profile');
  });

  it('pre-fills the form with the current name', async () => {
    await setup();
    flushInit();

    expect(component.form.controls.firstName.value).toBe('Grace');
    expect(component.form.controls.lastName.value).toBe('Hopper');
  });

  it('saves the updated name and updates the session', async () => {
    await setup();
    flushInit();

    component.form.patchValue({ firstName: 'Ada', lastName: 'Lovelace' });
    component.submit();

    const req = httpMock.expectOne(`${environment.apiUrl}/users/me`);
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual({ firstName: 'Ada', lastName: 'Lovelace', password: null });

    const updated = user({ firstName: 'Ada', lastName: 'Lovelace' });
    req.flush(updated);

    expect(component.success()).toBe(true);
    expect(authService.currentUser()).toEqual(updated);
  });

  it('rejects mismatched password confirmation', async () => {
    await setup();
    flushInit();

    component.form.patchValue({ password: 'password123', confirmPassword: 'different123' });
    component.submit();

    expect(component.form.hasError('passwordMismatch')).toBe(true);
    httpMock.expectNone((req) => req.method === 'PUT');
  });

  it('rejects a too-short password', async () => {
    await setup();
    flushInit();

    component.form.patchValue({ password: 'short', confirmPassword: 'short' });
    component.submit();

    expect(component.form.controls.password.hasError('minlength')).toBe(true);
    httpMock.expectNone((req) => req.method === 'PUT');
  });

  it('shows an error message when saving fails', async () => {
    await setup();
    flushInit();

    component.submit();

    httpMock.expectOne(`${environment.apiUrl}/users/me`).flush('boom', { status: 500, statusText: 'Internal Server Error' });

    expect(component.error()).toBe('Something went wrong saving your profile. Please try again.');
    expect(component.success()).toBe(false);
  });
});
