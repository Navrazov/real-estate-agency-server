export interface CreateListingBody {
  title: string;
  description: string;
  price: number;
  address: string;
  images?: string[];
  lat?: number;
  lng?: number;
}

export interface UpdateListingBody extends Partial<CreateListingBody> {}

export interface ListingsQuery {
  minPrice?: number;
  maxPrice?: number;
  swLat?: number;
  swLng?: number;
  neLat?: number;
  neLng?: number;
}

export interface ListingResponse {
  id: string;
  title: string;
  description: string;
  price: number;
  address: string;
  authorId: string;
  images: string[];
  createdAt: string;
  updatedAt: string;
}
