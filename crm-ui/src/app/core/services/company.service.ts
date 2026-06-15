import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import { CompanyResponse } from '../models/company.model';

const BASE_URL = `${environment.apiUrl}/companies`;

/**
 * HTTP access for the `/api/companies` resource, used by the company-
 * selection control on the contact form (requirement CON-08).
 */
@Injectable({ providedIn: 'root' })
export class CompanyService {
  private readonly http = inject(HttpClient);

  /**
   * Loads every company, ordered by name (`GET /api/companies`).
   *
   * @returns all companies
   */
  getCompanies(): Observable<CompanyResponse[]> {
    return this.http.get<CompanyResponse[]>(BASE_URL);
  }
}
