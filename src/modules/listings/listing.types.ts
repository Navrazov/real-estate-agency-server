import type { PropertyType, ListingStatus, PaymentType } from '../../shared/types.js';

export interface CreateListingBody {
  title: string;
  description: string;
  price: number;
  paymentType?: PaymentType;
  installmentMonths?: number;
  installmentMonthly?: number;
  address: string;
  propertyType?: PropertyType;
  rooms?: number;
  area?: number;
  floor?: number;
  totalFloors?: number;
  images?: string[];
  lat?: number;
  lng?: number;
}

export interface UpdateListingBody extends Partial<CreateListingBody> {
  status?: ListingStatus;
}

export interface ListingsQuery {
  search?: string;
  propertyType?: PropertyType;
  minPrice?: number;
  maxPrice?: number;
  minRooms?: number;
  maxRooms?: number;
  minArea?: number;
  maxArea?: number;
  status?: ListingStatus;
  swLat?: number;
  swLng?: number;
  neLat?: number;
  neLng?: number;
  sortBy?: 'price' | 'date' | 'views';
  sortOrder?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}

export interface ListingsResponse {
  items: ListingResponse[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface ListingResponse {
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
  views: number;
  isFavorite?: boolean;
  createdAt: string;
  updatedAt: string;
}
