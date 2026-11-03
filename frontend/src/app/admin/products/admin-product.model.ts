import { ProductImage, ProductVariant } from '../../core/models/catalog.model';

/** A product row as `GET /api/v1/admin/products` returns it. */
export interface AdminProduct {
  id: number;
  name: string;
  slug: string;
  sku: string;
  short_description?: string | null;
  image_url?: string | null;
  brand?: string | null;
  category?: string | null;
  category_id?: number | null;
  brand_id?: number | null;
  regular_price_cents: number;
  discounted_price_cents?: number | null;
  discount_percentage: number;
  in_stock: boolean;
  available_quantity: number;
  rating_average: number;
  rating_count: number;
  is_featured: boolean;
  is_new_arrival: boolean;
  description?: string | null;
  status: AdminProductStatus;
  images: ProductImage[];
  variants: ProductVariant[];
}

export type AdminProductStatus = 'draft' | 'published' | 'archived';

export type BulkAction = 'publish' | 'unpublish' | 'archive';

/** The body `POST`/`PUT /api/v1/admin/products` accepts. */
export interface AdminProductPayload {
  name: string;
  sku: string;
  category_id: number;
  brand_id?: number | null;
  regular_price_cents: number;
  description?: string | null;
  status?: AdminProductStatus;
}

/** The body `POST /api/v1/admin/products/{id}/variants` accepts. */
export interface AdminVariantPayload {
  sku: string;
  name: string;
  price_cents: number;
  stock: number;
}

export interface BulkActionResponse {
  updated: number;
  status: AdminProductStatus;
}

/** The messages the API and the form use (requirements 12.3 and 12.6). */
export const DUPLICATE_SKU_MESSAGE = 'This SKU is already in use';
export const INVALID_IMAGE_MESSAGE = 'Images must be JPEG or PNG and 5 MB or less';

/** The largest image the API accepts: 5 MB. */
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

const IMAGE_TYPES = ['image/jpeg', 'image/png'];
const IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png'];

/**
 * Whether a file is a JPEG or PNG of 5 MB or less (requirement 12.6).
 *
 * The browser reports an empty MIME type for some files, so the extension is
 * checked as well; a file must pass both checks when a type is reported.
 */
export function isAcceptedImage(file: File): boolean {
  if (file.size > MAX_IMAGE_BYTES) {
    return false;
  }
  const name = file.name.toLowerCase();
  const hasExtension = IMAGE_EXTENSIONS.some((extension) => name.endsWith(extension));
  if (!hasExtension) {
    return false;
  }
  if (file.type && !IMAGE_TYPES.includes(file.type)) {
    return false;
  }
  return true;
}

/** A human label for a product status. */
export function statusLabel(status: string): string {
  switch (status) {
    case 'published':
      return 'Published';
    case 'archived':
      return 'Archived';
    default:
      return 'Draft';
  }
}
