import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { CdkDragDrop } from '@angular/cdk/drag-drop';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { of } from 'rxjs';

import { DealBoardComponent } from './deal-board.component';
import { DealFormDialogComponent, DealFormDialogResult } from '../../../shared/deal-form-dialog/deal-form-dialog.component';
import { environment } from '../../../../environments/environment';
import { DealResponse, PipelineResponse } from '../../../core/models/deal.model';

describe('DealBoardComponent', () => {
  let fixture: ComponentFixture<DealBoardComponent>;
  let component: DealBoardComponent;
  let httpMock: HttpTestingController;

  function deal(overrides: Partial<DealResponse> = {}): DealResponse {
    return {
      id: 1,
      title: 'Deal A',
      value: 1000,
      stage: 'LEAD',
      closeDate: null,
      contactId: 5,
      contactName: 'Ada Lovelace',
      ownerId: 8,
      ownerName: 'Grace Hopper',
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
      ...overrides,
    };
  }

  function pipelineResponse(): PipelineResponse {
    return {
      stages: [
        {
          stage: 'LEAD',
          count: 2,
          totalValue: 3000,
          deals: [
            deal({ id: 1, title: 'Deal A', value: 1000 }),
            deal({ id: 2, title: 'Deal B', value: 2000, contactId: null, contactName: null, closeDate: '2026-01-01' }),
          ],
        },
        { stage: 'QUALIFIED', count: 0, totalValue: 0, deals: [] },
        { stage: 'PROPOSAL', count: 0, totalValue: 0, deals: [] },
        { stage: 'NEGOTIATION', count: 0, totalValue: 0, deals: [] },
        { stage: 'CLOSED_WON', count: 0, totalValue: 0, deals: [] },
        { stage: 'CLOSED_LOST', count: 0, totalValue: 0, deals: [] },
      ],
    };
  }

  async function setup(): Promise<void> {
    await TestBed.configureTestingModule({
      imports: [DealBoardComponent],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();

    httpMock = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(DealBoardComponent);
    component = fixture.componentInstance;
  }

  function flushLoad(): void {
    fixture.detectChanges();
    httpMock.expectOne(`${environment.apiUrl}/deals/pipeline`).flush(pipelineResponse());
    fixture.detectChanges();
  }

  afterEach(() => httpMock.verify());

  it('loads the pipeline and renders columns and deal cards', async () => {
    await setup();
    flushLoad();

    expect(component.pipeline().length).toBe(6);

    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('Lead');
    expect(text).toContain('Deal A');
    expect(text).toContain('Deal B');
    expect(text).toContain('Ada Lovelace');
    expect(text).toContain('$1,000');
    expect(text).toContain('$2,000');
    expect(text).toContain('$3,000');
  });

  it('shows an error message when loading fails', async () => {
    await setup();
    fixture.detectChanges();
    httpMock.expectOne(`${environment.apiUrl}/deals/pipeline`).flush('boom', { status: 500, statusText: 'Internal Server Error' });
    fixture.detectChanges();

    expect(component.error()).toBe(true);
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('Something went wrong');
  });

  it('opens the New Deal drawer and reloads the pipeline on result', async () => {
    await setup();
    flushLoad();

    const created = deal({ id: 3, title: 'New Biz', stage: 'LEAD' });
    const openSpy = spyOn(MatDialog.prototype, 'open').and.returnValue({
      afterClosed: () => of(created),
    } as unknown as MatDialogRef<DealFormDialogComponent, DealFormDialogResult>);

    component.newDeal();

    expect(openSpy).toHaveBeenCalledWith(DealFormDialogComponent, { data: {}, panelClass: 'drawer-panel' });
    httpMock.expectOne(`${environment.apiUrl}/deals/pipeline`).flush(pipelineResponse());
  });

  it('opens the edit drawer for a deal and reloads the pipeline on result', async () => {
    await setup();
    flushLoad();

    const target = component.pipeline()[0].deals[0];
    const openSpy = spyOn(MatDialog.prototype, 'open').and.returnValue({
      afterClosed: () => of('deleted' as DealFormDialogResult),
    } as unknown as MatDialogRef<DealFormDialogComponent, DealFormDialogResult>);

    component.editDeal(target);

    expect(openSpy).toHaveBeenCalledWith(DealFormDialogComponent, { data: { deal: target }, panelClass: 'drawer-panel' });
    httpMock.expectOne(`${environment.apiUrl}/deals/pipeline`).flush(pipelineResponse());
  });

  it('does not reload the pipeline when the drawer is cancelled', async () => {
    await setup();
    flushLoad();

    spyOn(MatDialog.prototype, 'open').and.returnValue({
      afterClosed: () => of(undefined),
    } as unknown as MatDialogRef<DealFormDialogComponent, DealFormDialogResult>);

    component.newDeal();

    httpMock.expectNone(`${environment.apiUrl}/deals/pipeline`);
    expect(component.pipeline().length).toBe(6);
  });

  it('moves a deal to a new stage on drop and persists it', async () => {
    await setup();
    flushLoad();

    const stages = component.pipeline();
    const lead = stages[0];
    const qualified = stages[1];
    const dealA = lead.deals[0];

    const event = {
      previousContainer: { data: lead.deals },
      container: { data: qualified.deals },
      previousIndex: 0,
      currentIndex: 0,
    } as unknown as CdkDragDrop<DealResponse[]>;

    component.drop(event, 'QUALIFIED');

    expect(lead.deals.map((d) => d.id)).toEqual([2]);
    expect(qualified.deals.map((d) => d.id)).toEqual([1]);
    expect(dealA.stage).toBe('QUALIFIED');
    expect(lead.count).toBe(1);
    expect(lead.totalValue).toBe(2000);
    expect(qualified.count).toBe(1);
    expect(qualified.totalValue).toBe(1000);

    const req = httpMock.expectOne(`${environment.apiUrl}/deals/1/stage`);
    expect(req.request.method).toBe('PATCH');
    expect(req.request.body).toEqual({ stage: 'QUALIFIED' });
    req.flush(deal({ id: 1, stage: 'QUALIFIED' }));
  });

  it('reverts the move if persisting the stage change fails', async () => {
    await setup();
    flushLoad();

    const stages = component.pipeline();
    const lead = stages[0];
    const qualified = stages[1];
    const dealA = lead.deals[0];

    const event = {
      previousContainer: { data: lead.deals },
      container: { data: qualified.deals },
      previousIndex: 0,
      currentIndex: 0,
    } as unknown as CdkDragDrop<DealResponse[]>;

    component.drop(event, 'QUALIFIED');

    httpMock
      .expectOne(`${environment.apiUrl}/deals/1/stage`)
      .flush('boom', { status: 500, statusText: 'Internal Server Error' });

    expect(lead.deals.map((d) => d.id)).toEqual([1, 2]);
    expect(qualified.deals.length).toBe(0);
    expect(dealA.stage).toBe('LEAD');
    expect(lead.count).toBe(2);
    expect(lead.totalValue).toBe(3000);
    expect(qualified.count).toBe(0);
    expect(qualified.totalValue).toBe(0);
  });

  it('reorders deals within the same column without persisting', async () => {
    await setup();
    flushLoad();

    const lead = component.pipeline()[0];
    const column = { data: lead.deals };

    const event = {
      previousContainer: column,
      container: column,
      previousIndex: 0,
      currentIndex: 1,
    } as unknown as CdkDragDrop<DealResponse[]>;

    component.drop(event, 'LEAD');

    expect(lead.deals.map((d) => d.id)).toEqual([2, 1]);
    httpMock.expectNone((req) => req.method === 'PATCH');
  });
});
