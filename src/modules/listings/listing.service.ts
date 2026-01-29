import { store } from '../../shared/store.js';
import { Listing } from '../../shared/types.js';
import type { CreateListingBody, UpdateListingBody } from './listing.types.js';

export const listingService = {
  create(authorId: string, body: CreateListingBody): Listing {
    const id = `listing_${store.nextListingId++}`;
    const now = new Date().toISOString();
    const listing: Listing = {
      id,
      title: body.title,
      description: body.description,
      price: body.price,
      address: body.address,
      authorId,
      images: body.images ?? [],
      lat: body.lat,
      lng: body.lng,
      createdAt: now,
      updatedAt: now,
    };
    store.listings.set(id, listing);
    return listing;
  },

  findById(id: string): Listing | undefined {
    return store.listings.get(id);
  },

  findAll(query?: { minPrice?: number; maxPrice?: number; swLat?: number; swLng?: number; neLat?: number; neLng?: number }): Listing[] {
    let list = Array.from(store.listings.values());
    if (query?.minPrice != null) list = list.filter((l) => l.price >= query.minPrice!);
    if (query?.maxPrice != null) list = list.filter((l) => l.price <= query.maxPrice!);
    if (query?.swLat != null && query?.swLng != null && query?.neLat != null && query?.neLng != null) {
      list = list.filter((l) => {
        const lat = l.lat ?? 0;
        const lng = l.lng ?? 0;
        return lat >= query.swLat! && lat <= query.neLat! && lng >= query.swLng! && lng <= query.neLng!;
      });
    }
    return list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  },

  findByAuthor(authorId: string): Listing[] {
    return this.findAll().filter((l) => l.authorId === authorId);
  },

  update(id: string, authorId: string, body: UpdateListingBody): Listing | null {
    const listing = store.listings.get(id);
    if (!listing || listing.authorId !== authorId) return null;
    if (body.title !== undefined) listing.title = body.title;
    if (body.description !== undefined) listing.description = body.description;
    if (body.price !== undefined) listing.price = body.price;
    if (body.address !== undefined) listing.address = body.address;
    if (body.images !== undefined) listing.images = body.images;
    if (body.lat !== undefined) listing.lat = body.lat;
    if (body.lng !== undefined) listing.lng = body.lng;
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
};
