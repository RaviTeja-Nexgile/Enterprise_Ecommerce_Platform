import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';

import { ApiClient } from '../core/api/api-client.service';
import { Category, StorefrontHome } from '../core/models/catalog.model';

/** A search suggestion from `GET /api/v1/products/search` (requirement 4.2). */
export interface SearchSuggestion {
  id: number;
  name: string;
  slug: string;
  image_url?: string | null;
  price_cents: number;
}

/**
 * The storefront home page data: the home sections, the header's category
 * mega-menu and search autocomplete, and the newsletter subscription.
 */
@Injectable({ providedIn: 'root' })
export class StorefrontService {
  private readonly api = inject(ApiClient);

  /** `GET /api/v1/storefront/home` — the home page sections (requirement 3.1). */
  home(): Observable<StorefrontHome> {
    return this.api.get<StorefrontHome>('storefront/home');
  }

  /** `GET /api/v1/categories` — the active category tree for the mega-menu. */
  categories(): Observable<Category[]> {
    return this.api
      .get<{ data: Category[] }>('categories')
      .pipe(map((response) => response.data));
  }

  /** `GET /api/v1/products/search` — up to 6 suggestions for the search bar. */
  search(q: string): Observable<SearchSuggestion[]> {
    return this.api
      .get<{ suggestions: SearchSuggestion[] }>('products/search', { q })
      .pipe(map((response) => response.suggestions));
  }

  /** `POST /api/v1/newsletter` — store a newsletter email (requirement 3.5). */
  subscribeNewsletter(email: string): Observable<{ message: string }> {
    return this.api.post<{ message: string }>('newsletter', { email });
  }
}