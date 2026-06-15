import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AvatarComponent } from './avatar.component';

describe('AvatarComponent', () => {
  let fixture: ComponentFixture<AvatarComponent>;
  let component: AvatarComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AvatarComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(AvatarComponent);
    component = fixture.componentInstance;
  });

  it('renders upper-case initials from the first and last name', () => {
    fixture.componentRef.setInput('firstName', 'ada');
    fixture.componentRef.setInput('lastName', 'lovelace');
    fixture.detectChanges();

    const span = (fixture.nativeElement as HTMLElement).querySelector('.avatar') as HTMLElement;
    expect(span.textContent?.trim()).toBe('AL');
  });

  it('defaults to a 32px diameter and scales the font size proportionally', () => {
    fixture.componentRef.setInput('firstName', 'Ada');
    fixture.componentRef.setInput('lastName', 'Lovelace');
    fixture.detectChanges();

    const span = (fixture.nativeElement as HTMLElement).querySelector('.avatar') as HTMLElement;
    expect(span.style.width).toBe('32px');
    expect(span.style.height).toBe('32px');
    expect(span.style.fontSize).toBe('13px');
  });

  it('applies the requested size', () => {
    fixture.componentRef.setInput('firstName', 'Ada');
    fixture.componentRef.setInput('lastName', 'Lovelace');
    fixture.componentRef.setInput('size', 80);
    fixture.detectChanges();

    const span = (fixture.nativeElement as HTMLElement).querySelector('.avatar') as HTMLElement;
    expect(span.style.width).toBe('80px');
    expect(span.style.height).toBe('80px');
    expect(span.style.fontSize).toBe('32px');
  });

  it('picks a deterministic background colour for a given name', () => {
    fixture.componentRef.setInput('firstName', 'Ada');
    fixture.componentRef.setInput('lastName', 'Lovelace');
    fixture.detectChanges();

    const color = component.backgroundColor();
    expect(color).toMatch(/^#[0-9A-F]{6}$/i);

    fixture.componentRef.setInput('firstName', 'Ada');
    fixture.componentRef.setInput('lastName', 'Lovelace');
    fixture.detectChanges();
    expect(component.backgroundColor()).toBe(color);
  });

  it('picks different background colours for different names', () => {
    fixture.componentRef.setInput('firstName', 'Ada');
    fixture.componentRef.setInput('lastName', 'Lovelace');
    fixture.detectChanges();
    const adaColor = component.backgroundColor();

    fixture.componentRef.setInput('firstName', 'Grace');
    fixture.componentRef.setInput('lastName', 'Hopper');
    fixture.detectChanges();
    const graceColor = component.backgroundColor();

    expect(graceColor).not.toBe(adaColor);
  });
});
