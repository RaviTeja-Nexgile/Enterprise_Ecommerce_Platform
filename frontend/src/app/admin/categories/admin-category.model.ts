/** A category node as `GET /api/v1/admin/categories` returns it. */
export interface AdminCategory {
  id: number;
  name: string;
  slug: string;
  description?: string | null;
  image_url?: string | null;
  parent_id?: number | null;
  status: 'active' | 'inactive';
  sort_order: number;
  product_count?: number;
  children?: AdminCategory[];
}

/** The body `POST`/`PUT /api/v1/admin/categories` accepts. */
export interface AdminCategoryPayload {
  name: string;
  description?: string | null;
  parent_id?: number | null;
  status?: 'active' | 'inactive';
  sort_order?: number;
}

/** The message the API returns when a category still holds products (13.4). */
export const CATEGORY_HAS_PRODUCTS_MESSAGE = "Move or archive this category's products first";

/** The success message after a category with no products is deleted (13.5). */
export const CATEGORY_DELETED_MESSAGE = 'Category deleted';

/** A human label for a category status. */
export function categoryStatusLabel(status: string): string {
  return status === 'active' ? 'Active' : 'Inactive';
}

/** The ids of a category and every category nested under it. */
export function categorySubtreeIds(category: AdminCategory): number[] {
  const ids: number[] = [category.id];
  const walk = (node: AdminCategory): void => {
    for (const child of node.children ?? []) {
      ids.push(child.id);
      walk(child);
    }
  };
  walk(category);
  return ids;
}