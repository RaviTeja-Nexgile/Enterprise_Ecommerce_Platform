import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import { ToastService } from '../../shared/toast/toast.service';

/** The search and filters the orders list is showing (requirement 15.8). */
export interface OrderExportFilters {
  q?: string;
  status?: string;
  from?: string;
  to?: string;
}

/** The success toast message for a completed export (requirement 23.4). */
export const EXPORT_SUCCESS_MESSAGE = 'Orders exported';

/**
 * Downloads the orders that match the current search and filters as a CSV
 * file (`GET /api/v1/admin/orders/export`, requirement 15.8).
 *
 * The request goes through `HttpClient` directly rather than `ApiClient` so the
 * answer is read as a `Blob`; the auth and error interceptors still attach the
 * token and turn a failed request into an error toast.
 */
@Injectable({ providedIn: 'root' })
export class OrderExportService {
  private readonly http = inject(HttpClient);
  private readonly toast = inject(ToastService);
  private readonly baseUrl = environment.apiBaseUrl;

  /** The URL the export is requested from, with the current filters. */
  exportUrl(filters: OrderExportFilters = {}): string {
    const params = this.toParams(filters);
    const query = params.toString();
    return `${this.baseUrl}/admin/orders/export${query ? `?${query}` : ''}`;
  }

  /** Request the CSV of the orders matching `filters`. */
  exportOrders(filters: OrderExportFilters = {}): Observable<Blob> {
    return this.http.get(this.exportUrl(filters), { responseType: 'blob' });
  }

  /**
   * Export, save and confirm: request the CSV of the orders matching
   * `filters`, download it as `orders.csv` and show a success toast with the
   * message for the export action (requirements 15.8 and 23.4). A failed
   * request becomes an error toast in the error interceptor.
   */
  exportCsv(filters: OrderExportFilters = {}): void {
    this.exportOrders(filters).subscribe({
      next: (blob) => {
        this.download(blob);
        this.toast.success(EXPORT_SUCCESS_MESSAGE);
      },
      // The failure is already shown as an error toast by the interceptor.
      error: () => undefined,
    });
  }

  /** Save a downloaded CSV as `orders.csv` in the browser. */
  download(blob: Blob, filename = 'orders.csv'): void {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  private toParams(filters: OrderExportFilters): HttpParams {
    let params = new HttpParams();
    for (const [key, value] of Object.entries(filters)) {
      if (value === undefined || value === null || value === '') {
        continue;
      }
      params = params.set(key, String(value));
    }
    return params;
  }
}
