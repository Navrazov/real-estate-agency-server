import { store } from '../../shared/store.js';
import { Listing, User } from '../../shared/types.js';
import type { CreateListingBody, UpdateListingBody, ListingsQuery, ListingsResponse, ListingResponse } from './listing.types.js';

function toResponse(listing: Listing, userId?: string): ListingResponse {
  const user = store.users.get(listing.authorId);
  const favorites = userId ? store.users.get(userId)?.favorites ?? [] : [];
  return {
    id: listing.id,
    title: listing.title,
    description: listing.description,
    price: listing.price,
    paymentType: listing.paymentType,
    installmentMonths: listing.installmentMonths,
    installmentMonthly: listing.installmentMonthly,
    address: listing.address,
    propertyType: listing.propertyType,
    rooms: listing.rooms,
    area: listing.area,
    floor: listing.floor,
    totalFloors: listing.totalFloors,
    authorId: listing.authorId,
    authorName: listing.authorName ?? user?.name ?? user?.email?.split('@')[0],
    authorPhone: listing.authorPhone ?? user?.phone,
    images: listing.images,
    lat: listing.lat,
    lng: listing.lng,
    status: listing.status,
    views: listing.views,
    isFavorite: favorites.includes(listing.id),
    createdAt: listing.createdAt,
    updatedAt: listing.updatedAt,
  };
}

export const listingService = {
  create(authorId: string, body: CreateListingBody, authorName?: string, authorPhone?: string): Listing {
    const id = `listing_${store.nextListingId++}`;
    const now = new Date().toISOString();
    const listing: Listing = {
      id,
      title: body.title,
      description: body.description,
      price: body.price,
      paymentType: body.paymentType ?? 'cash',
      installmentMonths: body.paymentType === 'installment' ? body.installmentMonths : undefined,
      installmentMonthly: body.paymentType === 'installment' ? body.installmentMonthly : undefined,
      address: body.address,
      propertyType: body.propertyType ?? 'apartment',
      rooms: body.rooms,
      area: body.area,
      floor: body.floor,
      totalFloors: body.totalFloors,
      authorId,
      authorName,
      authorPhone,
      images: body.images ?? [],
      lat: body.lat,
      lng: body.lng,
      status: 'active',
      views: 0,
      createdAt: now,
      updatedAt: now,
    };
    store.listings.set(id, listing);
    return listing;
  },

  findById(id: string, userId?: string, incrementViews = false): ListingResponse | undefined {
    const listing = store.listings.get(id);
    if (!listing) return undefined;
    if (incrementViews) {
      listing.views++;
      store.listings.set(id, listing);
    }
    return toResponse(listing, userId);
  },

  findAll(query: ListingsQuery = {}, userId?: string): ListingsResponse {
    let list = Array.from(store.listings.values());

    // Search
    if (query.search) {
      const s = query.search.toLowerCase();
      list = list.filter(
        (l) =>
          l.title.toLowerCase().includes(s) ||
          l.description.toLowerCase().includes(s) ||
          l.address.toLowerCase().includes(s)
      );
    }

    // Property type
    if (query.propertyType) list = list.filter((l) => l.propertyType === query.propertyType);

    // Status
    if (query.status) list = list.filter((l) => l.status === query.status);
    else list = list.filter((l) => l.status === 'active');

    // Price
    if (query.minPrice != null) list = list.filter((l) => l.price >= query.minPrice!);
    if (query.maxPrice != null) list = list.filter((l) => l.price <= query.maxPrice!);

    // Rooms
    if (query.minRooms != null) list = list.filter((l) => (l.rooms ?? 0) >= query.minRooms!);
    if (query.maxRooms != null) list = list.filter((l) => (l.rooms ?? 0) <= query.maxRooms!);

    // Area
    if (query.minArea != null) list = list.filter((l) => (l.area ?? 0) >= query.minArea!);
    if (query.maxArea != null) list = list.filter((l) => (l.area ?? 0) <= query.maxArea!);

    // Bounds
    if (query.swLat != null && query.swLng != null && query.neLat != null && query.neLng != null) {
      list = list.filter((l) => {
        if (l.lat == null || l.lng == null) return false;
        return l.lat >= query.swLat! && l.lat <= query.neLat! && l.lng >= query.swLng! && l.lng <= query.neLng!;
      });
    }

    // Sorting
    const sortBy = query.sortBy ?? 'date';
    const sortOrder = query.sortOrder ?? 'desc';
    list.sort((a, b) => {
      let cmp = 0;
      if (sortBy === 'price') cmp = a.price - b.price;
      else if (sortBy === 'views') cmp = a.views - b.views;
      else cmp = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      return sortOrder === 'desc' ? -cmp : cmp;
    });

    // Pagination
    const page = Math.max(1, query.page ?? 1);
    const limit = Math.min(100, Math.max(1, query.limit ?? 20));
    const total = list.length;
    const totalPages = Math.ceil(total / limit);
    const offset = (page - 1) * limit;
    const items = list.slice(offset, offset + limit).map((l) => toResponse(l, userId));

    return { items, total, page, limit, totalPages };
  },

  findByAuthor(authorId: string, userId?: string): ListingResponse[] {
    return Array.from(store.listings.values())
      .filter((l) => l.authorId === authorId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .map((l) => toResponse(l, userId));
  },

  update(id: string, authorId: string, body: UpdateListingBody, isAdmin?: boolean): Listing | null {
    const listing = store.listings.get(id);
    if (!listing) return null;
    if (listing.authorId !== authorId && !isAdmin) return null;
    if (body.title !== undefined) listing.title = body.title;
    if (body.description !== undefined) listing.description = body.description;
    if (body.price !== undefined) listing.price = body.price;
    if (body.paymentType !== undefined) {
      listing.paymentType = body.paymentType;
      if (body.paymentType === 'installment') {
        if (body.installmentMonths !== undefined) listing.installmentMonths = body.installmentMonths;
        if (body.installmentMonthly !== undefined) listing.installmentMonthly = body.installmentMonthly;
      } else {
        listing.installmentMonths = undefined;
        listing.installmentMonthly = undefined;
      }
    } else {
      if (body.installmentMonths !== undefined) listing.installmentMonths = body.installmentMonths;
      if (body.installmentMonthly !== undefined) listing.installmentMonthly = body.installmentMonthly;
    }
    if (body.address !== undefined) listing.address = body.address;
    if (body.propertyType !== undefined) listing.propertyType = body.propertyType;
    if (body.rooms !== undefined) listing.rooms = body.rooms;
    if (body.area !== undefined) listing.area = body.area;
    if (body.floor !== undefined) listing.floor = body.floor;
    if (body.totalFloors !== undefined) listing.totalFloors = body.totalFloors;
    if (body.images !== undefined) listing.images = body.images;
    if (body.lat !== undefined) listing.lat = body.lat;
    if (body.lng !== undefined) listing.lng = body.lng;
    if (body.status !== undefined) listing.status = body.status;
    listing.updatedAt = new Date().toISOString();
    store.listings.set(id, listing);
    return listing;
  },

  delete(id: string, authorId: string, isAdmin?: boolean): boolean {
    const listing = store.listings.get(id);
    if (!listing) return false;
    if (listing.authorId !== authorId && !isAdmin) return false;
    store.listings.delete(id);
    return true;
  },

  getStats() {
    const listings = Array.from(store.listings.values());
    const active = listings.filter((l) => l.status === 'active').length;
    const sold = listings.filter((l) => l.status === 'sold').length;
    const rented = listings.filter((l) => l.status === 'rented').length;
    const totalViews = listings.reduce((sum, l) => sum + l.views, 0);
    const byType: Record<string, number> = {};
    listings.forEach((l) => {
      byType[l.propertyType] = (byType[l.propertyType] ?? 0) + 1;
    });
    return { total: listings.length, active, sold, rented, totalViews, byType };
  },
};
