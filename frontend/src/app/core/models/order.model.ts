export type OrderStatus =
  | 'pending'
  | 'confirmed'
  | 'processing'
  | 'shipped'
  | 'delivered'
  | 'cancelled'
  | 'refunded';

export type PaymentStatus = 'pending' | 'success' | 'failed' | 'cancelled' | 'refunded';

export interface Address {
  id?: number;
  type: 'shipping' | 'billing';
  line1: string;
  line2?: string | null;
  city: string;
  state?: string | null;
  postal_code: string;
  country: string;
  is_default?: boolean;
}

export interface OrderItem {
  product_id: number;
  variant_id?: number | null;
  name: string;
  sku: string;
  quantity: number;
  unit_price_cents: number;
  total_cents: number;
}

export interface Order {
  id: number;
  order_number: string;
  status: OrderStatus;
  payment_status: PaymentStatus;
  subtotal_cents: number;
  discount_cents: number;
  shipping_cents: number;
  tax_cents: number;
  total_cents: number;
  delivery_method: string;
  placed_at: string;
  items: OrderItem[];
  shipping_address?: Address | null;
  billing_address?: Address | null;
  payment?: { status: PaymentStatus; method: string; transaction_id?: string | null };
  status_history?: { status: OrderStatus; changed_at: string; changed_by?: string | null }[];
}

export interface DeliveryMethod {
  code: string;
  name: string;
  fee_cents: number;
}

export interface CheckoutSummary {
  items: OrderItem[];
  subtotal_cents: number;
  discount_cents: number;
  shipping_cents: number;
  tax_cents: number;
  total_cents: number;
  delivery_methods: DeliveryMethod[];
}
