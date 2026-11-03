export interface Category {
  id: number;
  name: string;
  slug: string;
  description?: string | null;
  image_url?: string | null;
  parent_id?: number | null;
  status: string;
  sort_order: number;
  product_count?: number;
  children?: Category[];
}

export interface Brand {
  id: number;
  name: string;
  description?: string | null;
  logo_url?: string | null;
}

export interface ProductSummary {
  id: number;
  name: string;
  slug: string;
  sku: string;
  short_description?: string | null;
  image_url?: string | null;
  brand?: string | null;
  category?: string | null;
  regular_price_cents: number;
  discounted_price_cents?: number | null;
  discount_percentage: number;
  in_stock: boolean;
  available_quantity: number;
  rating_average: number;
  rating_count: number;
  is_featured: boolean;
  is_new_arrival: boolean;
}

export interface ProductImage {
  id: number;
  url: string;
  alt_text?: string | null;
  sort_order: number;
}

export interface ProductVariant {
  id: number;
  sku: string;
  name: string;
  price_cents: number;
  attributes?: Record<string, string> | null;
  status: string;
  available_quantity?: number;
}

export interface ProductDetail extends ProductSummary {
  description?: string | null;
  images: ProductImage[];
  variants: ProductVariant[];
  attributes?: Record<string, string>[];
  related?: ProductSummary[];
}

export interface Review {
  id: number;
  product_id: number;
  user_id: number;
  rating: number;
  comment: string;
  is_verified_purchase: boolean;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
  author?: string;
}

export interface StorefrontHome {
  hero: { title: string; subtitle: string; image_url?: string | null; cta?: string };
  featured_categories: Category[];
  trending: ProductSummary[];
  best_selling: ProductSummary[];
  new_arrivals: ProductSummary[];
  offers: ProductSummary[];
  testimonials: { name: string; quote: string; rating: number }[];
}
