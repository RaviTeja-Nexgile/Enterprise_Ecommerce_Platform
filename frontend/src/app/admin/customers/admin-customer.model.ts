/** A customer row of `GET /api/v1/admin/customers` (requirement 14.1). */
export interface AdminCustomer {
  id: number;
  name: string;
  email: string;
  phone: string | null;
  registered_at: string | null;
  is_active: boolean;
  total_spent_cents: number;
}

/** An address of a customer's profile (requirement 14.2). */
export interface AdminCustomerAddress {
  id: number;
  type: string;
  line1: string;
  line2: string | null;
  city: string;
  state: string | null;
  postal_code: string;
  country: string;
  is_default: boolean;
}

/** An order of a customer's profile (requirement 14.2). */
export interface AdminCustomerOrder {
  id: number;
  order_number: string;
  status: string;
  total_cents: number;
  placed_at: string | null;
}

/** `GET /api/v1/admin/customers/{id}`: details, addresses, orders and spending. */
export interface AdminCustomerProfile extends AdminCustomer {
  addresses: AdminCustomerAddress[];
  orders: AdminCustomerOrder[];
  order_count: number;
  spending: { total_cents: number };
}

/** The success messages of the status actions (requirement 23.4). */
export const CUSTOMER_ACTIVATED_MESSAGE = 'Customer activated';
export const CUSTOMER_DEACTIVATED_MESSAGE = 'Customer deactivated';

/** The message shown when the customer list cannot be loaded. */
export const CUSTOMERS_LOAD_ERROR_MESSAGE =
  'The customers could not be loaded. Please try again.';

/** The message shown when a customer profile cannot be loaded. */
export const CUSTOMER_LOAD_ERROR_MESSAGE =
  'This customer could not be loaded. Please try again.';

/** The account status label shown in the table and the profile. */
export function accountStatusLabel(isActive: boolean): string {
  return isActive ? 'Active' : 'Inactive';
}
