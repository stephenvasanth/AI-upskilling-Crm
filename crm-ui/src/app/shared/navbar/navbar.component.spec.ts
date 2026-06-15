import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideRouter } from '@angular/router';

import { NavbarComponent } from './navbar.component';
import { AuthService } from '../../core/services/auth.service';
import { UserResponse } from '../../core/models/user.model';

describe('NavbarComponent', () => {
  let fixture: ComponentFixture<NavbarComponent>;
  let authService: AuthService;

  const baseUser: UserResponse = {
    id: 1,
    firstName: 'Ada',
    lastName: 'Lovelace',
    email: 'ada@crm.local',
    role: 'USER',
    active: true,
    createdAt: '2026-01-01T00:00:00Z',
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NavbarComponent],
      providers: [provideRouter([]), provideHttpClient()],
    }).compileComponents();

    fixture = TestBed.createComponent(NavbarComponent);
    authService = TestBed.inject(AuthService);
  });

  afterEach(() => localStorage.clear());

  it('shows the current user name, role, and initials, but not the admin section, for a USER', () => {
    authService.setCurrentUser(baseUser);
    fixture.detectChanges();

    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('Ada Lovelace');
    expect(text).toContain('USER');
    expect(text).toContain('AL');
    expect(text).not.toContain('Users');
    expect(text).not.toContain('Tags');
  });

  it('shows the admin section for an ADMIN user', () => {
    authService.setCurrentUser({ ...baseUser, role: 'ADMIN' });
    fixture.detectChanges();

    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('Users');
    expect(text).toContain('Tags');
  });

  it('clears the session on logout', () => {
    authService.setCurrentUser(baseUser);
    fixture.detectChanges();

    fixture.componentInstance.logout();

    expect(authService.currentUser()).toBeNull();
    expect(authService.isAuthenticated()).toBe(false);
  });
});
