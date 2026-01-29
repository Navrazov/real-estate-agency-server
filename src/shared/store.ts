import { User, Listing } from './types.js';

export interface Store {
  users: Map<string, User>;
  listings: Map<string, Listing>;
  nextListingId: number;
}

export const store: Store = {
  users: new Map(),
  listings: new Map(),
  nextListingId: 1,
};
