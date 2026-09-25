export type UserRole = "ADMIN" | "BIZ" | "RETAIL";

export interface User {
  id: string;
  email: string;
  username: string;
  companyName?: string;
  roleType: UserRole;
  isApproved: boolean;
  isBlocked: boolean;
  nip: string | null;
  passwordHash?: string;
  jwt?: string;
  address?: string;
  phone?: string;
  createdAt: string;
  discount: number;
  tierName: string;
}

export interface Product {
  id: string;
  sku: string;
  name: string;
  categoryId: string;
  subcategoryId: string;
  manufacturer: string;
  price: number | null;
  stock: number;
  seoDescription: string;
  priceHidden?: boolean;
}

export const THEME_CONSTANTS = {
  MORNING_START: 6,
  MORNING_DURATION_MINUTES: 180,
  FALLBACK_SUNRISE: "06:00",
  FALLBACK_SUNSET: "19:00",
  SOLAR_REFRESH_DAYS: 60,
};
