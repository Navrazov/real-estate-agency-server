import { ListingModel } from '../../models/Listing.js';
import { UserModel } from '../../models/User.js';
import { subscriptionService } from '../subscriptions/subscription.service.js';
import { geocodingService } from '../geocoding/geocoding.service.js';
import type { CreateListingBody, UpdateListingBody, ListingsQuery, ListingsResponse, ListingResponse } from './listing.types.js';
import type { FilterQuery, SortOrder } from 'mongoose';
import type { IListing } from '../../models/Listing.js';
import type { IUser } from '../../models/User.js';
import type { SubscriptionPlan } from '../../models/Subscription.js';

/** Context about the user requesting the data – drives phone / lock filtering. */
export interface RequesterContext {
  userId?: string;
  plan: SubscriptionPlan;
  canSeePhones: boolean;
  maxVisibleListings: number;
}

/** A "no restrictions" context used for admin / own-listings views. */
const PREMIUM_CONTEXT: RequesterContext = {
  plan: 'premium',
  canSeePhones: true,
  maxVisibleListings: Infinity,
};

// ---------------------------------------------------------------------------
// Response helpers
// ---------------------------------------------------------------------------

/**
 * Build a single ListingResponse from pre-loaded data.
 *
 * Applies:
 * - **Phone filtering**: strip `authorPhone` when the author hid their phone
 *   OR the requester's plan does not allow seeing phones, UNLESS the listing
 *   belongs to the requester themselves.
 * - **Locking**: if the listing is marked locked, strip `description` and
 *   `authorPhone`.
 */
function buildResponse(
  listing: IListing,
  author: Partial<IUser> | null,
  favorites: string[] = [],
  ctx: RequesterContext = PREMIUM_CONTEXT,
  locked = false,
): ListingResponse {
  const isOwnListing = ctx.userId != null && listing.authorId === ctx.userId;

  const response: ListingResponse = {
    id: listing._id.toString(),
    title: listing.title,
    description: listing.description,
    price: listing.price,
    paymentType: listing.paymentType,
    dealType: listing.dealType ?? 'sale',
    installmentMonths: listing.installmentMonths,
    installmentMonthly: listing.installmentMonthly,
    address: listing.address,
    propertyType: listing.propertyType,
    apartmentType: listing.apartmentType,
    developer: listing.developer,
    complex: listing.complex,
    rooms: listing.rooms,
    area: listing.area,
    floor: listing.floor,
    totalFloors: listing.totalFloors,
    authorId: listing.authorId,
    authorName: listing.authorName ?? author?.name ?? author?.phone ?? 'Пользователь',
    authorPhone: listing.authorPhone ?? author?.phone,
    authorAvatar: author?.avatar,
    authorVerified: author?.verified ?? false,
    images: listing.images,
    lat: listing.lat,
    lng: listing.lng,
    status: listing.status,
    moderationStatus: listing.moderationStatus,
    moderationNote: listing.moderationNote,
    views: listing.views,
    isFavorite: favorites.includes(listing._id.toString()),
    createdAt: listing.createdAt.toISOString(),
    updatedAt: listing.updatedAt.toISOString(),
    // Assignment fields
    dduNumber: listing.dduNumber,
    dduDate: listing.dduDate?.toISOString(),
    assignmentOriginalPrice: listing.assignmentOriginalPrice,
    completionDate: listing.completionDate?.toISOString(),
  };

  // ---- Locking (free-tier restriction) ----
  if (locked && !isOwnListing) {
    response.locked = true;
    response.description = '';
    response.authorPhone = undefined;
    return response;
  }

  // ---- Phone filtering ----
  if (!isOwnListing) {
    const authorHidPhone = author?.phoneHidden === true;
    if (authorHidPhone || !ctx.canSeePhones) {
      response.authorPhone = undefined;
    }
  }

  return response;
}

/**
 * Build a single response by loading the author from the DB.
 * Used for create / update / findById where we have a single listing.
 */
async function toResponse(
  listing: IListing,
  ctx: RequesterContext = PREMIUM_CONTEXT,
): Promise<ListingResponse> {
  const user = await UserModel.findById(listing.authorId).lean() as Partial<IUser> | null;
  const favUser = ctx.userId ? await UserModel.findById(ctx.userId).lean() : null;
  const favorites = favUser?.favorites ?? [];

  // For single-listing views we need to determine locking.
  // A listing is locked when the requester has a finite maxVisibleListings limit
  // and this listing is NOT among the N most recent active+approved listings.
  let locked = false;
  if (Number.isFinite(ctx.maxVisibleListings)) {
    const recentIds = await getRecentAllowedIds(ctx.maxVisibleListings);
    locked = !recentIds.has(listing._id.toString());
  }

  return buildResponse(listing, user, favorites, ctx, locked);
}

/**
 * Batch-load authors for a list of listings (fixes N+1).
 * Also resolves locking for free users.
 */
async function batchResponses(
  listings: IListing[],
  ctx: RequesterContext = PREMIUM_CONTEXT,
): Promise<ListingResponse[]> {
  if (listings.length === 0) return [];

  // Collect unique author IDs
  const authorIds = [...new Set(listings.map(l => l.authorId))];

  // Batch load authors in one query
  const authors = await UserModel.find({ _id: { $in: authorIds } }).lean();
  const authorMap = new Map(authors.map(a => [a._id.toString(), a]));

  // Load favorites for requesting user (single query)
  let favorites: string[] = [];
  if (ctx.userId) {
    const favUser = await UserModel.findById(ctx.userId).select('favorites').lean();
    favorites = favUser?.favorites ?? [];
  }

  // Determine the set of allowed (unlocked) listing IDs for restricted users
  let allowedIds: Set<string> | null = null;
  if (Number.isFinite(ctx.maxVisibleListings)) {
    allowedIds = await getRecentAllowedIds(ctx.maxVisibleListings);
  }

  return listings.map(l => {
    const locked = allowedIds != null ? !allowedIds.has(l._id.toString()) : false;
    return buildResponse(
      l,
      (authorMap.get(l.authorId) as Partial<IUser> | undefined) ?? null,
      favorites,
      ctx,
      locked,
    );
  });
}

/**
 * Returns the IDs of the N most recent active+approved listings (globally).
 * Users with a finite maxVisibleListings limit may only see these unlocked.
 */
async function getRecentAllowedIds(limit: number): Promise<Set<string>> {
  const recent = await ListingModel.find(
    { status: 'active', moderationStatus: 'approved' },
  )
    .sort({ createdAt: -1 })
    .limit(limit)
    .select('_id')
    .lean();
  return new Set(recent.map(l => l._id.toString()));
}

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

export const listingService = {
  async create(authorId: string, body: CreateListingBody, authorName?: string, authorPhone?: string): Promise<ListingResponse> {
    // Check subscription limits
    const check = await subscriptionService.canCreateListing(authorId);
    if (!check.allowed) {
      throw Object.assign(new Error(check.reason!), { statusCode: 403 });
    }

    const resolvedCoords = await geocodingService.resolveListingCoordinates(body.address, body.lat, body.lng);

    const isAssignment = body.dealType === 'assignment';
    const listing = await ListingModel.create({
      title: body.title,
      description: body.description,
      price: body.price,
      paymentType: body.paymentType ?? 'cash',
      dealType: body.dealType ?? 'sale',
      installmentMonths: body.paymentType === 'installment' ? body.installmentMonths : undefined,
      installmentMonthly: body.paymentType === 'installment' ? body.installmentMonthly : undefined,
      address: body.address,
      propertyType: body.propertyType ?? 'apartment',
      apartmentType: body.propertyType === 'apartment' ? body.apartmentType : undefined,
      developer: body.propertyType === 'apartment' ? body.developer : undefined,
      complex: body.propertyType === 'apartment' ? body.complex : undefined,
      rooms: body.rooms,
      area: body.area,
      floor: body.floor,
      totalFloors: body.totalFloors,
      authorId,
      authorName,
      authorPhone,
      images: body.images,
      lat: resolvedCoords.lat,
      lng: resolvedCoords.lng,
      status: 'pending',
      moderationStatus: 'pending',
      // Assignment fields
      dduNumber: isAssignment ? body.dduNumber : undefined,
      dduDate: isAssignment && body.dduDate ? new Date(body.dduDate) : undefined,
      assignmentOriginalPrice: isAssignment ? body.assignmentOriginalPrice : undefined,
      completionDate: isAssignment && body.completionDate ? new Date(body.completionDate) : undefined,
    });
    // The author always sees their own listing without restrictions
    return toResponse(listing, { userId: authorId, plan: 'premium', canSeePhones: true, maxVisibleListings: Infinity });
  },

  async findById(id: string, ctx: RequesterContext = PREMIUM_CONTEXT, incrementViews = false): Promise<ListingResponse | undefined> {
    const listing = await ListingModel.findById(id);
    if (!listing) return undefined;
    if (incrementViews) {
      listing.views++;
      await listing.save();
    }
    return toResponse(listing, ctx);
  },

  async findAll(query: ListingsQuery = {}, ctx: RequesterContext = PREMIUM_CONTEXT): Promise<ListingsResponse> {
    const filter: FilterQuery<IListing> = {};

    if (query.search) {
      const regex = new RegExp(query.search, 'i');
      filter.$or = [
        { title: regex },
        { description: regex },
        { address: regex },
      ];
    }

    if (query.propertyType) filter.propertyType = query.propertyType;
    if (query.apartmentType) filter.apartmentType = query.apartmentType;
    if (query.paymentType) filter.paymentType = query.paymentType;
    if (query.dealType) filter.dealType = query.dealType;
    if (query.developer) filter.developer = query.developer;
    if (query.complex) filter.complex = query.complex;
    if (query.status) filter.status = query.status;
    else filter.status = 'active';

    // Public queries only show approved listings
    filter.moderationStatus = 'approved';

    if (query.minPrice != null || query.maxPrice != null) {
      filter.price = {};
      if (query.minPrice != null) filter.price.$gte = query.minPrice;
      if (query.maxPrice != null) filter.price.$lte = query.maxPrice;
    }

    if (query.minRooms != null || query.maxRooms != null) {
      filter.rooms = {};
      if (query.minRooms != null) filter.rooms.$gte = query.minRooms;
      if (query.maxRooms != null) filter.rooms.$lte = query.maxRooms;
    }

    if (query.minArea != null || query.maxArea != null) {
      filter.area = {};
      if (query.minArea != null) filter.area.$gte = query.minArea;
      if (query.maxArea != null) filter.area.$lte = query.maxArea;
    }

    if (query.swLat != null && query.swLng != null && query.neLat != null && query.neLng != null) {
      filter.lat = { $gte: query.swLat, $lte: query.neLat };
      filter.lng = { $gte: query.swLng, $lte: query.neLng };
    }

    const sortBy = query.sortBy ?? 'date';
    const sortOrder = query.sortOrder ?? 'desc';
    const dir: SortOrder = sortOrder === 'desc' ? -1 : 1;
    let sort: Record<string, SortOrder> = {};
    if (sortBy === 'price') sort = { price: dir };
    else if (sortBy === 'views') sort = { views: dir };
    else sort = { createdAt: dir };

    // Total listings matching the filter (before free-user restriction)
    const totalActive = await ListingModel.countDocuments(filter);

    // Users with a finite visibility limit: only return the N most recent allowed listings
    if (Number.isFinite(ctx.maxVisibleListings)) {
      const allowedIds = await getRecentAllowedIds(ctx.maxVisibleListings);
      const limitedFilter = { ...filter, _id: { $in: [...allowedIds] } };
      const listings = await ListingModel.find(limitedFilter).sort(sort).lean();
      const items = await batchResponses(listings as unknown as IListing[], ctx);
      return { items, total: items.length, page: 1, limit: items.length, totalPages: 1, totalActive };
    }

    // Paid users: normal pagination
    const page = Math.max(1, query.page ?? 1);
    const limit = Math.min(100, Math.max(1, query.limit ?? 20));
    const totalPages = Math.ceil(totalActive / limit);
    const offset = (page - 1) * limit;

    const listings = await ListingModel.find(filter).sort(sort).skip(offset).limit(limit).lean();
    const items = await batchResponses(listings as unknown as IListing[], ctx);

    return { items, total: totalActive, page, limit, totalPages };
  },

  async findByAuthor(authorId: string, ctx: RequesterContext = PREMIUM_CONTEXT): Promise<ListingResponse[]> {
    const listings = await ListingModel.find({ authorId }).sort({ createdAt: -1 }).lean();
    return batchResponses(listings as unknown as IListing[], ctx);
  },

  async findActiveByAuthor(authorId: string) {
    const listings = await ListingModel.find({ authorId, status: 'active' })
      .sort({ createdAt: -1 })
      .lean();
    return listings.map(l => ({
      id: l._id.toString(),
      title: l.title,
      price: l.price,
      address: l.address,
      propertyType: l.propertyType,
      images: l.images,
      rooms: l.rooms,
      area: l.area,
      createdAt: l.createdAt,
    }));
  },

  async findPendingModeration(): Promise<ListingResponse[]> {
    const listings = await ListingModel.find({ moderationStatus: 'pending' }).sort({ createdAt: 1 }).lean();
    return batchResponses(listings as unknown as IListing[], PREMIUM_CONTEXT);
  },

  async moderate(id: string, adminId: string, action: 'approve' | 'reject', note?: string): Promise<ListingResponse | null> {
    const listing = await ListingModel.findById(id);
    if (!listing) return null;

    listing.moderationStatus = action === 'approve' ? 'approved' : 'rejected';
    listing.moderationNote = note;
    listing.moderatedBy = adminId;
    listing.moderatedAt = new Date();

    if (action === 'approve') {
      listing.status = 'active';
    }

    await listing.save();
    return toResponse(listing, PREMIUM_CONTEXT);
  },

  async update(id: string, authorId: string, body: UpdateListingBody, isAdmin?: boolean): Promise<ListingResponse | null> {
    const listing = await ListingModel.findById(id);
    if (!listing) return null;
    if (listing.authorId !== authorId && !isAdmin) return null;

    // Prevent setting status back to 'pending' on approved listings
    if (body.status === 'pending' && listing.moderationStatus === 'approved') {
      delete body.status;
    }

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
    if (body.propertyType !== undefined) {
      listing.propertyType = body.propertyType;
      if (body.propertyType !== 'apartment') {
        listing.apartmentType = undefined;
        listing.developer = undefined;
        listing.complex = undefined;
      }
    }
    if (body.apartmentType !== undefined) listing.apartmentType = body.apartmentType;
    if (body.developer !== undefined) listing.developer = body.developer;
    if (body.complex !== undefined) listing.complex = body.complex;
    if (body.rooms !== undefined) listing.rooms = body.rooms;
    if (body.area !== undefined) listing.area = body.area;
    if (body.floor !== undefined) listing.floor = body.floor;
    if (body.totalFloors !== undefined) listing.totalFloors = body.totalFloors;
    if (body.images !== undefined) listing.images = body.images;
    if (body.lat !== undefined) listing.lat = body.lat;
    if (body.lng !== undefined) listing.lng = body.lng;
    if (body.address !== undefined && body.lat === undefined && body.lng === undefined) {
      const resolvedCoords = await geocodingService.resolveListingCoordinates(body.address);
      if (resolvedCoords.lat != null && resolvedCoords.lng != null) {
        listing.lat = resolvedCoords.lat;
        listing.lng = resolvedCoords.lng;
      }
    }
    if (body.status !== undefined) listing.status = body.status;
    // Deal type & assignment fields
    if (body.dealType !== undefined) {
      listing.dealType = body.dealType;
      if (body.dealType === 'assignment') {
        if (body.dduNumber !== undefined) listing.dduNumber = body.dduNumber;
        if (body.dduDate !== undefined) listing.dduDate = new Date(body.dduDate);
        if (body.assignmentOriginalPrice !== undefined) listing.assignmentOriginalPrice = body.assignmentOriginalPrice;
        if (body.completionDate !== undefined) listing.completionDate = new Date(body.completionDate);
      } else {
        listing.dduNumber = undefined;
        listing.dduDate = undefined;
        listing.assignmentOriginalPrice = undefined;
        listing.completionDate = undefined;
      }
    }

    await listing.save();
    // The author/admin always sees the full listing after update
    return toResponse(listing, { userId: authorId, plan: 'premium', canSeePhones: true, maxVisibleListings: Infinity });
  },

  async delete(id: string, authorId: string, isAdmin?: boolean): Promise<boolean> {
    const listing = await ListingModel.findById(id);
    if (!listing) return false;
    if (listing.authorId !== authorId && !isAdmin) return false;
    await ListingModel.findByIdAndDelete(id);
    return true;
  },

  async getStats() {
    const total = await ListingModel.countDocuments();
    const active = await ListingModel.countDocuments({ status: 'active' });
    const sold = await ListingModel.countDocuments({ status: 'sold' });
    const rented = await ListingModel.countDocuments({ status: 'rented' });
    const pending = await ListingModel.countDocuments({ moderationStatus: 'pending' });
    const viewsAgg = await ListingModel.aggregate([{ $group: { _id: null, totalViews: { $sum: '$views' } } }]);
    const totalViews = viewsAgg[0]?.totalViews ?? 0;
    const typeAgg = await ListingModel.aggregate([{ $group: { _id: '$propertyType', count: { $sum: 1 } } }]);
    const byType: Record<string, number> = {};
    typeAgg.forEach((t) => { byType[t._id] = t.count; });
    return { total, active, sold, rented, pending, totalViews, byType };
  },

  async getFilterOptions(): Promise<{ developers: string[]; complexes: string[] }> {
    const filter = { status: 'active', moderationStatus: 'approved' };
    const developers: string[] = await ListingModel.distinct('developer', filter);
    const complexes: string[] = await ListingModel.distinct('complex', filter);
    return {
      developers: developers.filter(v => v && v.trim()).sort(),
      complexes: complexes.filter(v => v && v.trim()).sort(),
    };
  },
};
