import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { ToastService } from '../../shared/toast/toast.service';
import { EXPORT_SUCCESS_MESSAGE, OrderExportService } from './order-export.service';

describe('OrderExportService', () => {
  let service: OrderExportService;
  let http: HttpTestingController;
  let toasts: ToastService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(OrderExportService);
    http = TestBed.inject(HttpTestingController);
    toasts = TestBed.inject(ToastService);
  });

  afterEach(() => {
    http.verify();
    jest.restoreAllMocks();
  });

  it('requests the CSV export with the current search and filters', () => {
    service
      .exportOrders({ q: 'ORD-2026', status: 'shipped', from: '2026-01-01', to: '2026-02-01' })
      .subscribe();

    const request = http.expectOne(
      '/api/v1/admin/orders/export?q=ORD-2026&status=shipped&from=2026-01-01&to=2026-02-01',
    );
    expect(request.request.method).toBe('GET');
    expect(request.request.responseType).toBe('blob');
    request.flush(new Blob(['Order number\n'], { type: 'text/csv' }));
  });

  it('omits empty filters from the export request', () => {
    service.exportOrders({ q: '', status: undefined, from: '', to: '' }).subscribe();

    const request = http.expectOne('/api/v1/admin/orders/export');
    expect(request.request.method).toBe('GET');
    request.flush(new Blob(['Order number\n'], { type: 'text/csv' }));
  });

  it('builds the export URL with the filters', () => {
    expect(service.exportUrl({ status: 'pending' })).toBe(
      '/api/v1/admin/orders/export?status=pending',
    );
    expect(service.exportUrl()).toBe('/api/v1/admin/orders/export');
  });

  it('downloads the CSV and shows a success toast when the export succeeds', () => {
    const download = jest.spyOn(service, 'download').mockImplementation(() => undefined);

    service.exportCsv({ status: 'shipped' });

    const request = http.expectOne('/api/v1/admin/orders/export?status=shipped');
    request.flush(new Blob(['Order number\n'], { type: 'text/csv' }));

    expect(download).toHaveBeenCalledWith(expect.any(Blob));
    const messages = toasts.toasts().map((toast) => toast.message);
    expect(messages).toContain(EXPORT_SUCCESS_MESSAGE);
    expect(toasts.toasts()[0].kind).toBe('success');
  });

  it('does not show a success toast when the export fails', () => {
    jest.spyOn(service, 'download').mockImplementation(() => undefined);

    service.exportCsv();

    const errorBody = JSON.stringify({
      error: { code: 'server_error', message: 'Something went wrong.' },
    });
    http.expectOne('/api/v1/admin/orders/export').flush(
      new Blob([errorBody], { type: 'application/json' }),
      { status: 500, statusText: 'Internal Server Error' },
    );

    expect(toasts.toasts().map((toast) => toast.message)).not.toContain(EXPORT_SUCCESS_MESSAGE);
  });
});
