import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import {
  DealCreateRequest,
  DealResponse,
  DealStageUpdateRequest,
  DealUpdateRequest,
  PipelineResponse,
} from '../models/deal.model';

const BASE_URL = `${environment.apiUrl}/deals`;

/**
 * HTTP access for the `/api/deals` resource (requirements DEA-01 to DEA-08).
 */
@Injectable({ providedIn: 'root' })
export class DealService {
  private readonly http = inject(HttpClient);

  /**
   * Loads the Kanban pipeline: every stage with its deals, count, and total
   * value (`GET /api/deals/pipeline`, cached server-side, requirement DEA-02).
   *
   * @returns the pipeline grouped by stage
   */
  getPipeline(): Observable<PipelineResponse> {
    return this.http.get<PipelineResponse>(`${BASE_URL}/pipeline`);
  }

  /**
   * Creates a new deal (`POST /api/deals`, requirement DEA-01).
   *
   * @param request the new deal's field values
   * @returns the created deal
   */
  createDeal(request: DealCreateRequest): Observable<DealResponse> {
    return this.http.post<DealResponse>(BASE_URL, request);
  }

  /**
   * Replaces a deal's editable fields (`PUT /api/deals/{id}`, requirement
   * DEA-06).
   *
   * @param id the deal id to update
   * @param request the new field values
   * @returns the updated deal
   */
  updateDeal(id: number, request: DealUpdateRequest): Observable<DealResponse> {
    return this.http.put<DealResponse>(`${BASE_URL}/${id}`, request);
  }

  /**
   * Moves a deal to a new pipeline stage (`PATCH /api/deals/{id}/stage`,
   * requirement DEA-04).
   *
   * @param id the deal id to move
   * @param request the target stage
   * @returns the updated deal
   */
  updateDealStage(id: number, request: DealStageUpdateRequest): Observable<DealResponse> {
    return this.http.patch<DealResponse>(`${BASE_URL}/${id}/stage`, request);
  }

  /**
   * Deletes a deal (`DELETE /api/deals/{id}`, requirement DEA-08).
   *
   * @param id the deal id to delete
   */
  deleteDeal(id: number): Observable<void> {
    return this.http.delete<void>(`${BASE_URL}/${id}`);
  }
}
