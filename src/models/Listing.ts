import mongoose, { Schema, Document } from 'mongoose';
import type { PropertyType, ListingStatus, PaymentType } from '../shared/types.js';

export interface IListing extends Document {
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
  createdAt: Date;
  updatedAt: Date;
}

const listingSchema = new Schema<IListing>(
  {
    title: { type: String, required: true },
    description: { type: String, required: true },
    price: { type: Number, required: true, min: 0 },
    paymentType: { type: String, enum: ['cash', 'installment'], default: 'cash' },
    installmentMonths: { type: Number },
    installmentMonthly: { type: Number },
    address: { type: String, required: true },
    propertyType: {
      type: String,
      enum: ['apartment', 'house', 'room', 'land', 'commercial'],
      default: 'apartment',
    },
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
    status: { type: String, enum: ['active', 'sold', 'rented'], default: 'active' },
    views: { type: Number, default: 0 },
  },
  { timestamps: true }
);

listingSchema.index({ price: 1 });
listingSchema.index({ status: 1 });
listingSchema.index({ lat: 1, lng: 1 });

export const ListingModel = mongoose.model<IListing>('Listing', listingSchema);
