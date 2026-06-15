import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter, Router } from '@angular/router';

import { LoginComponent } from './login.component';
import { environment } from '../../../../environments/environment';
import { LoginResponse } from '../../../core/models/auth.model';

describe('LoginComponent', () => {
  let fixture: ComponentFixture<LoginComponent>;
  let component: LoginComponent;
  let httpMock: HttpTestingController;
  let router: Router;

  const loginResponse: LoginResponse = {
    token: 'jwt-token',
    user: {
      id: 1,
      firstName: 'Ada',
      lastName: 'Lovelace',
      email: 'ada@crm.local',
      role: 'USER',
      active: true,
      createdAt: '2026-01-01T00:00:00Z',
    },
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LoginComponent],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();

    fixture = TestBed.createComponent(LoginComponent);
    component = fixture.componentInstance;
    httpMock = TestBed.inject(HttpTestingController);
    router = TestBed.inject(Router);
    fixture.detectChanges();
  });

  afterEach(() => {
    httpMock.verify();
    localStorage.clear();
  });

  it('does not submit when the form is invalid', () => {
    component.submit();
    expect(component.loading()).toBe(false);
    httpMock.expectNone(`${environment.apiUrl}/auth/login`);
  });

  it('navigates to / on successful login', () => {
    const navigateSpy = spyOn(router, 'navigate');
    component.form.setValue({ email: 'ada@crm.local', password: 'password123' });

    component.submit();
    expect(component.loading()).toBe(true);

    const req = httpMock.expectOne(`${environment.apiUrl}/auth/login`);
    req.flush(loginResponse);

    expect(component.loading()).toBe(false);
    expect(component.error()).toBeNull();
    expect(navigateSpy).toHaveBeenCalledWith(['/']);
  });

  it('shows an "Invalid email or password" error for a 401 response', () => {
    component.form.setValue({ email: 'ada@crm.local', password: 'wrong' });

    component.submit();
    const req = httpMock.expectOne(`${environment.apiUrl}/auth/login`);
    req.flush({ message: 'Unauthorized' }, { status: 401, statusText: 'Unauthorized' });

    expect(component.loading()).toBe(false);
    expect(component.error()).toBe('Invalid email or password');
  });

  it('shows a generic error for a server error response', () => {
    component.form.setValue({ email: 'ada@crm.local', password: 'password123' });

    component.submit();
    const req = httpMock.expectOne(`${environment.apiUrl}/auth/login`);
    req.flush({ message: 'Boom' }, { status: 500, statusText: 'Internal Server Error' });

    expect(component.error()).toBe('Something went wrong. Please try again.');
  });

  it('toggles password visibility', () => {
    expect(component.hidePassword()).toBe(true);
    component.togglePasswordVisibility();
    expect(component.hidePassword()).toBe(false);
  });
});
