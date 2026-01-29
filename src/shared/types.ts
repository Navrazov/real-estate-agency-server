import { Role } from '../config/constants.js';

export interface User {
  id: string;
  email: string;
  passwordHash: string;
  role: Role;
  blocked: boolean;
  createdAt: string;
}

export interface Listing {
  id: string;
  title: string;
  description: string;
  price: number;
  address: string;
  authorId: string;
  images: string[];
  lat?: number;
  lng?: number;
  createdAt: string;
  updatedAt: string;
}
