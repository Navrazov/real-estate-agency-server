import { env } from '../../config/env.js';

interface GeocodeSuggestion {
  title: string;
  address: string;
  lat: number;
  lng: number;
}

interface GeocodeResponse {
  suggestions: GeocodeSuggestion[];
}

interface ReverseGeocodeResponse {
  address: string;
  lat: number;
  lng: number;
}

const BASE_URL = 'https://geocode-maps.yandex.ru/1.x/';
const CACHE_TTL_MS = 30 * 24 * 60 * 60 * 1000;
const CACHE_MAX_ENTRIES = 5000;

type CacheEntry<T> = {
  value: T;
  expiresAt: number;
};

const geocodeCache = new Map<string, CacheEntry<GeocodeResponse>>();
const reverseCache = new Map<string, CacheEntry<ReverseGeocodeResponse>>();

function normalizeQuery(value: string): string {
  return value.trim().replace(/\s+/g, ' ').toLowerCase();
}

function makeReverseKey(lat: number, lng: number): string {
  return `${lat.toFixed(6)},${lng.toFixed(6)}`;
}

function getCached<T>(cache: Map<string, CacheEntry<T>>, key: string): T | null {
  const hit = cache.get(key);
  if (!hit) return null;
  if (Date.now() > hit.expiresAt) {
    cache.delete(key);
    return null;
  }
  return hit.value;
}

function setCached<T>(cache: Map<string, CacheEntry<T>>, key: string, value: T): void {
  if (cache.size >= CACHE_MAX_ENTRIES) {
    const firstKey = cache.keys().next().value;
    if (firstKey) cache.delete(firstKey);
  }
  cache.set(key, { value, expiresAt: Date.now() + CACHE_TTL_MS });
}

async function fetchYandex(params: Record<string, string>): Promise<any> {
  if (!env.yandexGeocoderApiKey) {
    throw Object.assign(new Error('Yandex geocoder key is missing'), { statusCode: 503 });
  }

  const query = new URLSearchParams({
    apikey: env.yandexGeocoderApiKey,
    format: 'json',
    lang: 'ru_RU',
    ...params,
  });

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);

  try {
    const response = await fetch(`${BASE_URL}?${query.toString()}`, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'RealEstateServer/1.0',
      },
    });

    if (!response.ok) {
      throw Object.assign(new Error(`Geocoder request failed with status ${response.status}`), { statusCode: 502 });
    }

    return await response.json();
  } finally {
    clearTimeout(timeout);
  }
}

function parseFeature(feature: any): GeocodeSuggestion | null {
  const pointPos = feature?.GeoObject?.Point?.pos as string | undefined;
  if (!pointPos) return null;

  const [lngStr, latStr] = pointPos.split(' ');
  const lat = Number(latStr);
  const lng = Number(lngStr);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;

  const meta = feature?.GeoObject?.metaDataProperty?.GeocoderMetaData;
  const title = (meta?.AddressDetails?.Country?.AddressLine as string | undefined)
    ?? (meta?.text as string | undefined)
    ?? '';
  const address = (meta?.text as string | undefined) ?? title;

  return {
    title: title || address,
    address,
    lat,
    lng,
  };
}

function parseFeatures(payload: any): GeocodeSuggestion[] {
  const members = payload?.response?.GeoObjectCollection?.featureMember;
  if (!Array.isArray(members)) return [];

  const results: GeocodeSuggestion[] = [];
  for (const member of members) {
    const parsed = parseFeature(member);
    if (parsed) results.push(parsed);
  }
  return results;
}

export const geocodingService = {
  async search(query: string, limit = 5): Promise<GeocodeResponse> {
    const normalized = normalizeQuery(query);
    if (!normalized) return { suggestions: [] };

    const key = `search:${normalized}:${Math.max(1, Math.min(10, limit))}`;
    const cached = getCached(geocodeCache, key);
    if (cached) return cached;

    const payload = await fetchYandex({
      geocode: query,
      results: String(Math.max(1, Math.min(10, limit))),
    });

    const suggestions = parseFeatures(payload);
    const value = { suggestions };
    setCached(geocodeCache, key, value);
    return value;
  },

  async geocode(address: string): Promise<GeocodeSuggestion | null> {
    const result = await this.search(address, 1);
    return result.suggestions[0] ?? null;
  },

  async reverse(lat: number, lng: number): Promise<ReverseGeocodeResponse | null> {
    const key = `reverse:${makeReverseKey(lat, lng)}`;
    const cached = getCached(reverseCache, key);
    if (cached) return cached;

    const payload = await fetchYandex({
      geocode: `${lng},${lat}`,
      results: '1',
      kind: 'house',
    });

    const first = parseFeatures(payload)[0];
    if (!first) return null;

    const value: ReverseGeocodeResponse = {
      address: first.address,
      lat: first.lat,
      lng: first.lng,
    };
    setCached(reverseCache, key, value);
    return value;
  },

  async resolveListingCoordinates(address: string, lat?: number, lng?: number): Promise<{ lat?: number; lng?: number }> {
    if (Number.isFinite(lat) && Number.isFinite(lng)) {
      return { lat, lng };
    }

    if (!address || !address.trim()) {
      return {};
    }

    try {
      const geocoded = await this.geocode(address);
      if (!geocoded) return {};
      return { lat: geocoded.lat, lng: geocoded.lng };
    } catch {
      return {};
    }
  },
};
