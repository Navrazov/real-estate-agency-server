import mongoose from 'mongoose';
import { env } from '../config/env.js';
import { ListingModel } from '../models/Listing.js';

await mongoose.connect(env.mongoUri);
const result = await ListingModel.updateMany(
  { authorPhone: '+7 (900) 000-00-01' },
  { $set: { views: 0 } }
);
console.log('Updated', result.modifiedCount, 'listings — views set to 0');
await mongoose.disconnect();
