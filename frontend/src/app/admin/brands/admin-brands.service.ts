import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { ApiClient } from '../../core/api/api-client.service';
import { AdminBrand, AdminBrandPayload } from './admin-brand.model';

/**
 * The admin brand endpoints of design.md "API contract": list, create and
 * update (requirement 13.6).
 */
@Injectable({ providedIn: 'root' })
export class AdminBrandsService {
  private readonly api = inject(ApiClient);

  list(): Observable<{ data: AdminBrand[] }> {
    return this.api.get<{ data: AdminBrand[] }>('admin/brands');
  }

  create(payload: AdminBrandPayload): Observable<AdminBrand> {
    return this.api.post<AdminBrand>('admin/brands', payload);
  }

  update(id: number, payload: Partial<AdminBrandPayload>): Observable<AdminBrand> {
    return this.api.put<AdminBrand>(`admin/brands/${id}`, payload);
  }
}