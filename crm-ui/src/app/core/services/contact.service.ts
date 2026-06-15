import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import { ContactCreateRequest, ContactResponse, ContactUpdateRequest } from '../models/contact.model';
import { PageResponse } from '../models/page.model';

const BASE_URL = `${environment.apiUrl}/contacts`;

/** Optional filters/pagination/sorting for {@link ContactService.getContacts}. */
export interface ContactListParams {
  search?: string;
  tagId?: number;
  page?: number;
  size?: number;
  /** Spring `sort` syntax, e.g. `'createdAt,desc'`. */
  sort?: string;
}

/**
 * HTTP access for the `/api/contacts` resource (requirements CON-01 to CON-09).
 */
@Injectable({ providedIn: 'root' })
export class ContactService {
  private readonly http = inject(HttpClient);

  /**
   * Loads a page of contacts, optionally filtered by search term or tag
   * (`GET /api/contacts?search&tagId&page&size`).
   *
   * @param params optional search/tagId/page/size filters
   * @returns the matching page of contacts
   */
  getContacts(params: ContactListParams = {}): Observable<PageResponse<ContactResponse>> {
    let httpParams = new HttpParams();
    if (params.search) {
      httpParams = httpParams.set('search', params.search);
    }
    if (params.tagId !== undefined) {
      httpParams = httpParams.set('tagId', params.tagId);
    }
    if (params.page !== undefined) {
      httpParams = httpParams.set('page', params.page);
    }
    if (params.size !== undefined) {
      httpParams = httpParams.set('size', params.size);
    }
    if (params.sort) {
      httpParams = httpParams.set('sort', params.sort);
    }
    return this.http.get<PageResponse<ContactResponse>>(BASE_URL, { params: httpParams });
  }

  /**
   * Loads a single contact by id (`GET /api/contacts/{id}`).
   *
   * @param id the contact id
   * @returns the contact
   */
  getContact(id: number): Observable<ContactResponse> {
    return this.http.get<ContactResponse>(`${BASE_URL}/${id}`);
  }

  /**
   * Creates a new contact (`POST /api/contacts`, requirement CON-01).
   *
   * @param request the new contact's field values
   * @returns the created contact
   */
  createContact(request: ContactCreateRequest): Observable<ContactResponse> {
    return this.http.post<ContactResponse>(BASE_URL, request);
  }

  /**
   * Replaces a contact's editable fields (`PUT /api/contacts/{id}`,
   * requirement CON-02).
   *
   * @param id the contact id to update
   * @param request the new field values
   * @returns the updated contact
   */
  updateContact(id: number, request: ContactUpdateRequest): Observable<ContactResponse> {
    return this.http.put<ContactResponse>(`${BASE_URL}/${id}`, request);
  }

  /**
   * Deletes a contact (`DELETE /api/contacts/{id}`).
   *
   * @param id the contact id to delete
   */
  deleteContact(id: number): Observable<void> {
    return this.http.delete<void>(`${BASE_URL}/${id}`);
  }
}
