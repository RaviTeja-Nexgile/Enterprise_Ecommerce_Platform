export type RoleName =
  | 'Super Admin'
  | 'Admin'
  | 'Inventory Manager'
  | 'Order Manager'
  | 'Customer';

export interface User {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  phone?: string | null;
  roles: string[];
  permissions: string[];
  is_active: boolean;
}

export interface AuthTokens {
  access_token: string;
  refresh_token?: string;
}

export interface AuthResponse extends AuthTokens {
  user: User;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  first_name: string;
  last_name: string;
  email: string;
  password: string;
  phone?: string;
}

/** The first screen each role opens after sign-in (design.md). */
export const ROLE_HOME: Record<RoleName, string> = {
  'Super Admin': '/admin',
  Admin: '/admin',
  'Inventory Manager': '/admin/inventory',
  'Order Manager': '/admin/orders',
  Customer: '/',
};

export function homeForRoles(roles: string[]): string {
  for (const role of roles) {
    const home = ROLE_HOME[role as RoleName];
    if (home) {
      return home;
    }
  }
  return '/';
}

export function isAdminRole(roles: string[]): boolean {
  return roles.some((role) => role !== 'Customer');
}
