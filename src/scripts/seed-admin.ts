import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { env } from '../config/env.js';
import { UserModel } from '../models/User.js';

const email = process.env.ADMIN_EMAIL;
const password = process.env.ADMIN_PASSWORD;

if (!email || !password) {
  console.error('Set ADMIN_EMAIL and ADMIN_PASSWORD environment variables');
  process.exit(1);
}

await mongoose.connect(env.mongoUri);

const existing = await UserModel.findOne({ email });
if (existing) {
  if (existing.role !== 'admin') {
    existing.role = 'admin';
    await existing.save();
    console.log(`User ${email} promoted to admin`);
  } else {
    console.log(`Admin ${email} already exists`);
  }
} else {
  const passwordHash = await bcrypt.hash(password, 10);
  await UserModel.create({ email, passwordHash, role: 'admin' });
  console.log(`Admin ${email} created`);
}

await mongoose.disconnect();
