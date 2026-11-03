import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { ApiClient } from '../../core/api/api-client.service';
import { Paginated } from '../../core/models/api.model';
import { AdminCustomer, AdminCustomerProfile } from './admin-customer.model';

/**
 * The admin customer endpoints of design.md "API contract": the searchable
 * list, a customer's profile and the account status change
 * (requirements 14.1 to 14.4).
 */
@Injectable({ providedIn: 'root' })
export class AdminCustomersService {
  private readonly api = inject(ApiClient);

  list(query: { q?: string; page?: number; per_page?: number }): Observable<Paginated<AdminCustomer>> {
    return this.api.get<Paginated<AdminCustomer>>('admin/customers', query);
  }

  profile(id: number): Observable<AdminCustomerProfile> {
    return this.api.get<AdminCustomerProfile>(`admin/customers/${id}`);
  }

  /** Activate or deactivate a customer account (requirements 14.3 and 14.4). */
  setActive(id: number, isActive: boolean): Observable<AdminCustomer> {
    return this.api.patch<AdminCustomer>(`admin/customers/${id}`, { is_active: isActive });
  }
}
