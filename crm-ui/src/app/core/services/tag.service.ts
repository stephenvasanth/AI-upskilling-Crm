import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import { TagCreateRequest, TagResponse } from '../models/tag.model';

const BASE_URL = `${environment.apiUrl}/tags`;

/**
 * HTTP access for the `/api/tags` resource (requirements TAG-01 to TAG-03).
 * Tag creation/deletion are ADMIN-only at the backend; this service does not
 * duplicate that check.
 */
@Injectable({ providedIn: 'root' })
export class TagService {
  private readonly http = inject(HttpClient);

  /**
   * Loads every tag (`GET /api/tags`).
   *
   * @returns all tags
   */
  getTags(): Observable<TagResponse[]> {
    return this.http.get<TagResponse[]>(BASE_URL);
  }

  /**
   * Creates a new tag (`POST /api/tags`, ADMIN only).
   *
   * @param request the tag's name and colour
   * @returns the created tag
   */
  createTag(request: TagCreateRequest): Observable<TagResponse> {
    return this.http.post<TagResponse>(BASE_URL, request);
  }

  /**
   * Deletes a tag (`DELETE /api/tags/{id}`, ADMIN only).
   *
   * @param id the tag id to delete
   */
  deleteTag(id: number): Observable<void> {
    return this.http.delete<void>(`${BASE_URL}/${id}`);
  }
}
