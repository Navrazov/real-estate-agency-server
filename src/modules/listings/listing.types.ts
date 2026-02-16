import type { PropertyType, ApartmentType, ListingStatus, PaymentType, DealType, ModerationStatus } from '../../shared/types.js';

export interface CreateListingBody {
  title: string;
  description: string;
  price: number;
  paymentType?: PaymentType;
  dealType?: DealType;
  installmentMonths?: number;
  installmentMonthly?: number;
  address: string;
  propertyType?: PropertyType;
  apartmentType?: ApartmentType;
  developer?: string;
  complex?: string;
  rooms?: number;
  area?: number;
  floor?: number;
  totalFloors?: number;
  images: string[];
  lat?: number;
  lng?: number;
  // Assignment fields
  dduNumber?: string;
  dduDate?: string;
  assignmentOriginalPrice?: number;
  completionDate?: string;
}

export interface UpdateListingBody extends Partial<CreateListingBody> {
  status?: ListingStatus;
}

export interface ListingsQuery {
  search?: string;
  propertyType?: PropertyType;
  apartmentType?: ApartmentType;
  paymentType?: PaymentType;
  dealType?: DealType;
  developer?: string;
  complex?: string;
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
  dealType: string;
  installmentMonths?: number;
  installmentMonthly?: number;
  address: string;
  propertyType: PropertyType;
  apartmentType?: ApartmentType;
  developer?: string;
  complex?: string;
  rooms?: number;
  area?: number;
  floor?: number;
  totalFloors?: number;
  authorId: string;
  authorName?: string;
  authorPhone?: string;
  authorAvatar?: string;
  authorVerified?: boolean;
  images: string[];
  lat?: number;
  lng?: number;
  status: ListingStatus;
  moderationStatus: ModerationStatus;
  moderationNote?: string;
  views: number;
  isFavorite?: boolean;
  createdAt: string;
  updatedAt: string;
  // Assignment fields
  dduNumber?: string;
  dduDate?: string;
  assignmentOriginalPrice?: number;
  completionDate?: string;
}

export interface ModerationAction {
  action: 'approve' | 'reject';
  note?: string;
}
