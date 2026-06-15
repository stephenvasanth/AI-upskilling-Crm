import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { MatDialogRef } from '@angular/material/dialog';

import { TagFormDialogComponent } from './tag-form-dialog.component';
import { environment } from '../../../environments/environment';
import { TagResponse } from '../../core/models/tag.model';

describe('TagFormDialogComponent', () => {
  let fixture: ComponentFixture<TagFormDialogComponent>;
  let component: TagFormDialogComponent;
  let httpMock: HttpTestingController;
  let dialogRef: jasmine.SpyObj<MatDialogRef<TagFormDialogComponent, TagResponse | undefined>>;

  async function setup(): Promise<void> {
    dialogRef = jasmine.createSpyObj('MatDialogRef', ['close']);

    await TestBed.configureTestingModule({
      imports: [TagFormDialogComponent],
      providers: [provideHttpClient(), provideHttpClientTesting(), { provide: MatDialogRef, useValue: dialogRef }],
    }).compileComponents();

    httpMock = TestBed.inject(HttpTestingController);

    fixture = TestBed.createComponent(TagFormDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }

  afterEach(() => httpMock.verify());

  it('renders the New Tag form with default values', async () => {
    await setup();

    expect(component.form.controls.name.value).toBe('');
    expect(component.form.controls.color.value).toBe('#4F46E5');

    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('New Tag');
  });

  it('blocks submit when the name is missing', async () => {
    await setup();

    component.submit();

    expect(component.form.controls.name.touched).toBe(true);
    httpMock.expectNone(`${environment.apiUrl}/tags`);
    expect(dialogRef.close).not.toHaveBeenCalled();
  });

  it('rejects an invalid hex colour', async () => {
    await setup();

    component.form.setValue({ name: 'VIP', color: 'blue' });
    component.submit();

    expect(component.form.controls.color.hasError('pattern')).toBe(true);
    httpMock.expectNone(`${environment.apiUrl}/tags`);
  });

  it('creates a tag and closes with the result', async () => {
    await setup();

    component.form.setValue({ name: 'VIP', color: '#10B981' });
    component.submit();

    const req = httpMock.expectOne(`${environment.apiUrl}/tags`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ name: 'VIP', color: '#10B981' });

    const created: TagResponse = { id: 5, name: 'VIP', color: '#10B981' };
    req.flush(created);

    expect(dialogRef.close).toHaveBeenCalledWith(created);
    expect(component.saving()).toBe(false);
  });

  it('shows a conflict-specific error when the tag name already exists', async () => {
    await setup();

    component.form.setValue({ name: 'VIP', color: '#10B981' });
    component.submit();

    httpMock.expectOne(`${environment.apiUrl}/tags`).flush('boom', { status: 409, statusText: 'Conflict' });

    expect(component.error()).toBe('A tag with this name already exists.');
    expect(dialogRef.close).not.toHaveBeenCalled();
  });

  it('updates the colour control when the swatch input changes', async () => {
    await setup();

    const input = document.createElement('input');
    input.value = '#123456';
    component.onSwatchChange({ target: input } as unknown as Event);

    expect(component.form.controls.color.value).toBe('#123456');
  });

  it('cancel closes the dialog without saving', async () => {
    await setup();

    component.cancel();

    expect(dialogRef.close).toHaveBeenCalledWith();
  });
});
