import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { ApiClient } from '../../core/api/api-client.service';
import { AdminCategory, AdminCategoryPayload } from './admin-category.model';

/**
 * The admin category endpoints of design.md "API contract": the tree, create,
 * update and delete (requirements 13.1 to 13.5).
 */
@Injectable({ providedIn: 'root' })
export class AdminCategoriesService {
  private readonly api = inject(ApiClient);

  tree(): Observable<{ data: AdminCategory[] }> {
    return this.api.get<{ data: AdminCategory[] }>('admin/categories');
  }

  create(payload: AdminCategoryPayload): Observable<AdminCategory> {
    return this.api.post<AdminCategory>('admin/categories', payload);
  }

  update(id: number, payload: Partial<AdminCategoryPayload>): Observable<AdminCategory> {
    return this.api.put<AdminCategory>(`admin/categories/${id}`, payload);
  }

  delete(id: number): Observable<void> {
    return this.api.delete<void>(`admin/categories/${id}`);
  }
}

/** A category row with its depth in the tree, for an indented table or select. */
export interface CategoryRow {
  category: AdminCategory;
  depth: number;
}

/** Flatten a category tree into rows with their depth (requirement 13.1). */
export function flattenCategoryTree(tree: AdminCategory[], depth = 0): CategoryRow[] {
  const rows: CategoryRow[] = [];
  for (const category of tree) {
    rows.push({ category, depth });
    if (category.children?.length) {
      rows.push(...flattenCategoryTree(category.children, depth + 1));
    }
  }
  return rows;
}