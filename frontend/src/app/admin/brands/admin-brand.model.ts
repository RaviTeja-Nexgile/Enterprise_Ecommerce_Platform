/** A brand as `GET /api/v1/admin/brands` returns it. */
export interface AdminBrand {
  id: number;
  name: string;
  description?: string | null;
  logo_url?: string | null;
}

/** The body `POST`/`PUT /api/v1/admin/brands` accepts. */
export interface AdminBrandPayload {
  name: string;
  description?: string | null;
  logo_url?: string | null;
}

/** The message the API returns when a brand name is already taken. */
export const DUPLICATE_BRAND_MESSAGE = 'This brand already exists';