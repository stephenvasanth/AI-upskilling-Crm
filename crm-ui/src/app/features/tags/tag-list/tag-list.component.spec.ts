import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { of } from 'rxjs';

import { TagListComponent } from './tag-list.component';
import { ConfirmDialogComponent } from '../../../shared/confirm-dialog/confirm-dialog.component';
import { TagFormDialogComponent } from '../../../shared/tag-form-dialog/tag-form-dialog.component';
import { environment } from '../../../../environments/environment';
import { TagResponse } from '../../../core/models/tag.model';

describe('TagListComponent', () => {
  let fixture: ComponentFixture<TagListComponent>;
  let component: TagListComponent;
  let httpMock: HttpTestingController;

  function tag(overrides: Partial<TagResponse> = {}): TagResponse {
    return { id: 5, name: 'VIP', color: '#10B981', ...overrides };
  }

  async function setup(): Promise<void> {
    await TestBed.configureTestingModule({
      imports: [TagListComponent],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();

    httpMock = TestBed.inject(HttpTestingController);

    fixture = TestBed.createComponent(TagListComponent);
    component = fixture.componentInstance;
  }

  /** Flushes the initial tags request fired by `ngOnInit`. */
  function flushInit(tags: TagResponse[] = [tag()]): void {
    fixture.detectChanges();
    httpMock.expectOne(`${environment.apiUrl}/tags`).flush(tags);
    fixture.detectChanges();
  }

  afterEach(() => httpMock.verify());

  it('loads and displays the tags', async () => {
    await setup();
    flushInit([tag({ name: 'Hot Lead', color: '#F59E0B' })]);

    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('Hot Lead');
  });

  it('shows the empty state when there are no tags', async () => {
    await setup();
    flushInit([]);

    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('No tags yet');
  });

  it('shows an error message when loading fails', async () => {
    await setup();
    fixture.detectChanges();
    httpMock.expectOne(`${environment.apiUrl}/tags`).flush('boom', { status: 500, statusText: 'Internal Server Error' });
    fixture.detectChanges();

    expect(component.error()).toBe(true);
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('Something went wrong');
  });

  it('opens the New Tag drawer and reloads on result', async () => {
    await setup();
    flushInit();

    const openSpy = spyOn(MatDialog.prototype, 'open').and.returnValue({
      afterClosed: () => of(tag({ id: 9, name: 'New Tag' })),
    } as unknown as MatDialogRef<TagFormDialogComponent, TagResponse>);

    component.newTag();

    expect(openSpy).toHaveBeenCalledWith(TagFormDialogComponent, { panelClass: 'drawer-panel' });
    httpMock.expectOne(`${environment.apiUrl}/tags`).flush([tag(), tag({ id: 9, name: 'New Tag' })]);
  });

  it('deletes a tag after confirmation and reloads', async () => {
    await setup();
    flushInit([tag()]);

    spyOn(MatDialog.prototype, 'open').and.returnValue({
      afterClosed: () => of(true),
    } as unknown as MatDialogRef<ConfirmDialogComponent, boolean>);

    component.deleteTag(component.tags()[0]);

    const req = httpMock.expectOne(`${environment.apiUrl}/tags/5`);
    expect(req.request.method).toBe('DELETE');
    req.flush(null);

    httpMock.expectOne(`${environment.apiUrl}/tags`).flush([]);
  });

  it('does not delete the tag when the confirmation is cancelled', async () => {
    await setup();
    flushInit([tag()]);

    spyOn(MatDialog.prototype, 'open').and.returnValue({
      afterClosed: () => of(false),
    } as unknown as MatDialogRef<ConfirmDialogComponent, boolean>);

    component.deleteTag(component.tags()[0]);

    expect(component.tags().length).toBe(1);
    httpMock.expectNone((req) => req.method === 'DELETE');
  });
});
