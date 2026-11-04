import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { ApiClient } from '../../core/api/api-client.service';
import { Paginated } from '../../core/models/api.model';
import { OrderStatus } from '../../core/models/order.model';
import { AdminOrder } from './admin-order.model';

/** The search and filters of the admin order list (requirement 15.1). */
export interface AdminOrderQuery {
  q?: string;
  status?: string;
  from?: string;
  to?: string;
  page?: number;
  per_page?: number;
  [key: string]: string | number | boolean | undefined;
}

/**
 * The admin order endpoints of design.md "API contract": the searchable list,
 * one order, the status change, the cancel and the refund
 * (requirements 15.1 to 15.6).
 */
@Injectable({ providedIn: 'root' })
export class AdminOrdersService {
  private readonly api = inject(ApiClient);

  list(query: AdminOrderQuery): Observable<Paginated<AdminOrder>> {
    return this.api.get<Paginated<AdminOrder>>('admin/orders', query);
  }

  get(id: number | string): Observable<AdminOrder> {
    return this.api.get<AdminOrder>(`admin/orders/${id}`);
  }

  /** Move an order to `status` (requirements 15.3 and 15.4). */
  changeStatus(id: number, status: OrderStatus): Observable<AdminOrder> {
    return this.api.patch<AdminOrder>(`admin/orders/${id}/status`, { status });
  }

  /** Cancel an unshipped order, releasing stock and refunding in full (15.5). */
  cancel(id: number): Observable<AdminOrder> {
    return this.changeStatus(id, 'cancelled');
  }

  /** Refund a delivered order in full (requirement 15.6). */
  refund(id: number): Observable<AdminOrder> {
    return this.api.post<AdminOrder>(`admin/orders/${id}/refund`);
  }
}
