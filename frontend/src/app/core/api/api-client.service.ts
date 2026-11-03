import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import { HealthResponse, ListQuery } from '../models/api.model';

/**
 * The single place the app talks to the Flask API.
 *
 * Every call goes through `/api/v1` (proxied to the API by the dev server).
 * The auth and error interceptors add the access token and turn failures into
 * toasts, so feature services only describe the request.
 */
@Injectable({ providedIn: 'root' })
export class ApiClient {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = environment.apiBaseUrl;

  get<T>(path: string, query?: ListQuery): Observable<T> {
    return this.http.get<T>(this.url(path), { params: this.toParams(query) });
  }

  post<T>(path: string, body: unknown = {}): Observable<T> {
    return this.http.post<T>(this.url(path), body);
  }

  put<T>(path: string, body: unknown = {}): Observable<T> {
    return this.http.put<T>(this.url(path), body);
  }

  patch<T>(path: string, body: unknown = {}): Observable<T> {
    return this.http.patch<T>(this.url(path), body);
  }

  delete<T>(path: string): Observable<T> {
    return this.http.delete<T>(this.url(path));
  }

  upload<T>(path: string, file: File, field = 'file'): Observable<T> {
    const form = new FormData();
    form.append(field, file);
    return this.http.post<T>(this.url(path), form);
  }

  /** `GET /api/health` — used to show whether the API is reachable. */
  health(): Observable<HealthResponse> {
    return this.http.get<HealthResponse>(environment.healthUrl);
  }

  /** Build an absolute API URL for a path such as `products/12`. */
  url(path: string): string {
    const clean = path.startsWith('/') ? path.slice(1) : path;
    return `${this.baseUrl}/${clean}`;
  }

  private toParams(query?: ListQuery): HttpParams {
    let params = new HttpParams();
    if (!query) {
      return params;
    }
    for (const [key, value] of Object.entries(query)) {
      if (value === undefined || value === null || value === '') {
        continue;
      }
      params = params.set(key, String(value));
    }
    return params;
  }
}
