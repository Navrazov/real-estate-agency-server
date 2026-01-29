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
      createdAt: now,
      updatedAt: now,
    };
    store.listings.set(id, listing);
    return listing;
  },

  findById(id: string): Listing | undefined {
    return store.listings.get(id);
  },

  findAll(): Listing[] {
    return Array.from(store.listings.values()).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
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
