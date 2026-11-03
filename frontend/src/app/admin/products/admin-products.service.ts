import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { ApiClient } from '../../core/api/api-client.service';
import { ListQuery, Paginated } from '../../core/models/api.model';
import { Brand, Category, ProductImage, ProductVariant } from '../../core/models/catalog.model';
import {
  AdminProduct,
  AdminProductPayload,
  AdminVariantPayload,
  BulkAction,
  BulkActionResponse,
} from './admin-product.model';

/** The filters the product table sends to `GET /api/v1/admin/products`. */
export interface AdminProductQuery extends ListQuery {
  q?: string;
  status?: string;
  category?: string;
  brand?: string;
  page?: number;
  per_page?: number;
}

/**
 * The admin product endpoints of design.md "API contract".
 *
 * Every call goes through `ApiClient`, so the auth and error interceptors add
 * the token and turn a failure into a toast.
 */
@Injectable({ providedIn: 'root' })
export class AdminProductsService {
  private readonly api = inject(ApiClient);

  list(query: AdminProductQuery = {}): Observable<Paginated<AdminProduct>> {
    return this.api.get<Paginated<AdminProduct>>('admin/products', {
      per_page: 20,
      ...query,
    });
  }

  get(id: number): Observable<AdminProduct> {
    return this.api.get<AdminProduct>(`admin/products/${id}`);
  }

  create(payload: AdminProductPayload): Observable<AdminProduct> {
    return this.api.post<AdminProduct>('admin/products', payload);
  }

  update(id: number, payload: Partial<AdminProductPayload>): Observable<AdminProduct> {
    return this.api.put<AdminProduct>(`admin/products/${id}`, payload);
  }

  /** Archive a product; its order history is kept (requirement 12.10). */
  archive(id: number): Observable<void> {
    return this.api.delete<void>(`admin/products/${id}`);
  }

  /** Publish, unpublish or archive every selected product (requirement 12.9). */
  bulk(ids: number[], action: BulkAction): Observable<BulkActionResponse> {
    return this.api.post<BulkActionResponse>('admin/products/bulk', { ids, action });
  }

  uploadImage(productId: number, file: File): Observable<ProductImage> {
    return this.api.upload<ProductImage>(`admin/products/${productId}/images`, file);
  }

  deleteImage(productId: number, imageId: number): Observable<void> {
    return this.api.delete<void>(`admin/products/${productId}/images/${imageId}`);
  }

  addVariant(productId: number, payload: AdminVariantPayload): Observable<ProductVariant> {
    return this.api.post<ProductVariant>(`admin/products/${productId}/variants`, payload);
  }

  /** The category tree, flattened for the form's category select. */
  categories(): Observable<{ data: Category[] }> {
    return this.api.get<{ data: Category[] }>('admin/categories');
  }

  brands(): Observable<{ data: Brand[] }> {
    return this.api.get<{ data: Brand[] }>('admin/brands');
  }
}

/** Flatten a category tree into a list with its depth, for a select. */
export function flattenCategories(
  tree: Category[],
  depth = 0,
): { category: Category; depth: number }[] {
  const rows: { category: Category; depth: number }[] = [];
  for (const category of tree) {
    rows.push({ category, depth });
    if (category.children?.length) {
      rows.push(...flattenCategories(category.children, depth + 1));
    }
  }
  return rows;
}
