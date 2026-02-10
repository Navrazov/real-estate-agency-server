import { Role } from '../config/constants.js';

export interface User {
  id: string;
  email: string;
  name?: string;
  phone?: string;
  avatar?: string;
  passwordHash: string;
  role: Role;
  blocked: boolean;
  favorites: string[];
  createdAt: string;
}

export type PropertyType = 'apartment' | 'house' | 'room' | 'land' | 'commercial';
export type ListingStatus = 'pending' | 'active' | 'sold' | 'rented';
export type PaymentType = 'cash' | 'installment';
export type ModerationStatus = 'pending' | 'approved' | 'rejected';

export interface Listing {
  id: string;
  title: string;
  description: string;
  price: number;
  paymentType: PaymentType;
  installmentMonths?: number;
  installmentMonthly?: number;
  address: string;
  propertyType: PropertyType;
  rooms?: number;
  area?: number;
  floor?: number;
  totalFloors?: number;
  authorId: string;
  authorName?: string;
  authorPhone?: string;
  images: string[];
  lat?: number;
  lng?: number;
  status: ListingStatus;
  moderationStatus: ModerationStatus;
  moderationNote?: string;
  moderatedBy?: string;
  moderatedAt?: string;
  views: number;
  createdAt: string;
  updatedAt: string;
}
