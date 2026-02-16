import mongoose, { Schema, Document } from 'mongoose';
import type { PropertyType, ApartmentType, ListingStatus, PaymentType, DealType, ModerationStatus } from '../shared/types.js';

export interface IListing extends Document {
  title: string;
  description: string;
  price: number;
  paymentType: PaymentType;
  dealType: DealType;
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
  images: string[];
  lat?: number;
  lng?: number;
  status: ListingStatus;
  moderationStatus: ModerationStatus;
  moderationNote?: string;
  moderatedBy?: string;
  moderatedAt?: Date;
  views: number;
  createdAt: Date;
  updatedAt: Date;
  // Assignment (переуступка) fields
  dduNumber?: string;
  dduDate?: Date;
  assignmentOriginalPrice?: number;
  completionDate?: Date;
}

const listingSchema = new Schema<IListing>(
  {
    title: { type: String, required: true },
    description: { type: String, required: true },
    price: { type: Number, required: true, min: 0 },
    paymentType: { type: String, enum: ['cash', 'installment'], default: 'cash' },
    dealType: { type: String, enum: ['sale', 'assignment'], default: 'sale' },
    installmentMonths: { type: Number },
    installmentMonthly: { type: Number },
    address: { type: String, required: true },
    propertyType: {
      type: String,
      enum: ['apartment', 'house', 'land', 'commercial'],
      default: 'apartment',
    },
    apartmentType: { type: String, enum: ['new', 'secondary'] },
    developer: { type: String },
    complex: { type: String },
    rooms: { type: Number },
    area: { type: Number },
    floor: { type: Number },
    totalFloors: { type: Number },
    authorId: { type: String, required: true, index: true },
    authorName: { type: String },
    authorPhone: { type: String },
    images: { type: [String], default: [] },
    lat: { type: Number },
    lng: { type: Number },
    status: { type: String, enum: ['pending', 'active', 'sold', 'rented'], default: 'pending' },
    moderationStatus: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
    moderationNote: { type: String },
    moderatedBy: { type: String },
    moderatedAt: { type: Date },
    views: { type: Number, default: 0 },
    // Assignment (переуступка) fields
    dduNumber: { type: String },
    dduDate: { type: Date },
    assignmentOriginalPrice: { type: Number },
    completionDate: { type: Date },
  },
  { timestamps: true }
);

listingSchema.index({ price: 1 });
listingSchema.index({ status: 1 });
listingSchema.index({ moderationStatus: 1 });
listingSchema.index({ lat: 1, lng: 1 });

export const ListingModel = mongoose.model<IListing>('Listing', listingSchema);
