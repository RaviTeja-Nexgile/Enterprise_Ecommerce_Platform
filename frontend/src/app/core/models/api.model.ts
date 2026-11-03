/** The error envelope every API failure returns. */
export interface ApiErrorBody {
  code: string;
  message: string;
  fields?: Record<string, string>;
}

export interface ApiErrorResponse {
  error: ApiErrorBody;
}

/** A paginated list answer: `{data: [...], meta: {...}}`. */
export interface Paginated<T> {
  data: T[];
  meta: PageMeta;
}

export interface PageMeta {
  page: number;
  per_page: number;
  total: number;
  total_pages: number;
}

export interface ListQuery {
  page?: number;
  per_page?: number;
  sort?: string;
  q?: string;
  [key: string]: string | number | boolean | undefined;
}

export interface HealthResponse {
  status: string;
  service: string;
}
