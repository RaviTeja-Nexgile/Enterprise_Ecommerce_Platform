import { Order, OrderStatus } from '../../core/models/order.model';

/** The customer shown on an admin order (requirement 15.1). */
export interface AdminOrderCustomer {
  id: number;
  name: string;
  email: string;
}

/** An order of `GET /api/v1/admin/orders` and `GET /api/v1/admin/orders/{id}`. */
export interface AdminOrder extends Order {
  customer?: AdminOrderCustomer | null;
}

/** The order statuses an Order Manager can filter by (requirement 15.1). */
export const ORDER_STATUSES: readonly OrderStatus[] = [
  'pending',
  'confirmed',
  'processing',
  'shipped',
  'delivered',
  'cancelled',
  'refunded',
];

/** The next status in Pending → Confirmed → Processing → Shipped → Delivered. */
export const NEXT_STATUS: Partial<Record<OrderStatus, OrderStatus>> = {
  pending: 'confirmed',
  confirmed: 'processing',
  processing: 'shipped',
  shipped: 'delivered',
};

/** The statuses an order can be cancelled from (requirement 15.5). */
export const CANCELLABLE_STATUSES: ReadonlySet<OrderStatus> = new Set<OrderStatus>([
  'pending',
  'confirmed',
  'processing',
]);

/** The message the API returns for a status that does not follow the current one. */
export const INVALID_TRANSITION_MESSAGE = 'This status change is not allowed';

/** The success messages of the order actions (requirement 23.4). */
export const ORDER_STATUS_UPDATED_MESSAGE = 'Order status updated';
export const ORDER_CANCELLED_MESSAGE = 'Order cancelled';
export const ORDER_REFUNDED_MESSAGE = 'Order refunded';

/** The message shown when the order list cannot be loaded. */
export const ORDERS_LOAD_ERROR_MESSAGE = 'The orders could not be loaded. Please try again.';

/** The message shown when one order cannot be loaded. */
export const ORDER_LOAD_ERROR_MESSAGE = 'This order could not be loaded. Please try again.';

/** The label of an order status, e.g. `pending` → `Pending`. */
export function orderStatusLabel(status: string): string {
  return status.charAt(0).toUpperCase() + status.slice(1).replace(/_/g, ' ');
}

/** The next status an order can move to, or `null` when it is final. */
export function nextStatus(status: OrderStatus): OrderStatus | null {
  return NEXT_STATUS[status] ?? null;
}

/** Whether an order can still be cancelled (requirement 15.5). */
export function canCancelOrder(status: OrderStatus): boolean {
  return CANCELLABLE_STATUSES.has(status);
}

/** Whether a delivered order can be refunded (requirement 15.6). */
export function canRefundOrder(status: OrderStatus): boolean {
  return status === 'delivered';
}
