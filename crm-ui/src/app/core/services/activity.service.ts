import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import { ActivityCreateRequest, ActivityResponse } from '../models/activity.model';
import { PageResponse } from '../models/page.model';

const BASE_URL = `${environment.apiUrl}/activities`;

/** Optional filters/pagination for {@link ActivityService.getActivities}. */
export interface ActivityListParams {
  contactId?: number;
  dealId?: number;
  page?: number;
  size?: number;
}

/**
 * HTTP access for the `/api/activities` resource (requirements ACT-01 to ACT-05).
 */
@Injectable({ providedIn: 'root' })
export class ActivityService {
  private readonly http = inject(HttpClient);

  /**
   * Loads a page of activities, optionally filtered by contact or deal
   * (`GET /api/activities?contactId&dealId&page&size`).
   *
   * @param params optional contactId/dealId/page/size filters
   * @returns the matching page of activities
   */
  getActivities(params: ActivityListParams = {}): Observable<PageResponse<ActivityResponse>> {
    let httpParams = new HttpParams();
    if (params.contactId !== undefined) {
      httpParams = httpParams.set('contactId', params.contactId);
    }
    if (params.dealId !== undefined) {
      httpParams = httpParams.set('dealId', params.dealId);
    }
    if (params.page !== undefined) {
      httpParams = httpParams.set('page', params.page);
    }
    if (params.size !== undefined) {
      httpParams = httpParams.set('size', params.size);
    }
    return this.http.get<PageResponse<ActivityResponse>>(BASE_URL, { params: httpParams });
  }

  /**
   * Logs a new activity against a contact and/or deal (`POST /api/activities`,
   * requirement ACT-01).
   *
   * @param request the new activity's field values
   * @returns the created activity
   */
  createActivity(request: ActivityCreateRequest): Observable<ActivityResponse> {
    return this.http.post<ActivityResponse>(BASE_URL, request);
  }

  /**
   * Deletes an activity (`DELETE /api/activities/{id}`).
   *
   * @param id the activity id to delete
   */
  deleteActivity(id: number): Observable<void> {
    return this.http.delete<void>(`${BASE_URL}/${id}`);
  }
}
