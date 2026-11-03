import { ProductSummary } from './catalog.model';

export interface CartItem {
  id: number;
  product_id: number;
  variant_id?: number | null;
  quantity: number;
  unit_price_cents: number;
  total_cents: number;
  in_stock: boolean;
  available_quantity: number;
  product?: ProductSummary;
}

export interface Cart {
  items: CartItem[];
  subtotal_cents: number;
  discount_cents: number;
  tax_cents: number;
  shipping_cents: number;
  total_cents: number;
  item_count: number;
  coupon?: { code: string; type: string; value: number } | null;
}

export interface WishlistItem {
  id: number;
  product: ProductSummary;
  available: boolean;
}
