// IndexedDB wrapper using Dexie (replaces SQLite from mobile app)
import Dexie, { Table } from 'dexie';
import type { Precinct, Sector, LawCategory, LawEntry, RecentSearch, Favorite, UserPreference, Squad, RdoSchedule, SavedPlace } from '@/types';

export class NYCDatabase extends Dexie {
  precincts!: Table<Precinct, number>;
  sectors!: Table<Sector, string>;
  lawCategories!: Table<LawCategory, string>;
  lawEntries!: Table<LawEntry, number>;
  recentSearches!: Table<RecentSearch, number>;
  favorites!: Table<Favorite, number>;
  userPreferences!: Table<UserPreference, string>;
  squads!: Table<Squad, number>;
  rdoSchedules!: Table<RdoSchedule, number>;
  savedPlaces!: Table<SavedPlace & { id: string }, string>;

  constructor() {
    super('NYCPrecinctDB');

    this.version(1).stores({
      precincts: 'precinctNum, borough',
      sectors: 'sectorId, precinctNum',
      lawCategories: 'categoryId, displayOrder',
      lawEntries: '++entryId, categoryId, sectionNumber, title',
      recentSearches: '++searchId, timestamp',
      favorites: '++favoriteId, precinctNum, createdAt',
      userPreferences: 'key, updatedAt',
      squads: 'squadId, displayOrder',
      rdoSchedules: 'scheduleId, squadId',
      savedPlaces: 'id, type',
    });
  }
}

export const db = new NYCDatabase();

// Initialize database with precinct data
export async function initializeDatabase() {
  try {
    const count = await db.precincts.count();
    if (count > 0) {
      const sample = await db.precincts.orderBy('precinctNum').first();
      const hasValidSeed =
        !!sample &&
        Number.isFinite(sample.precinctNum) &&
        sample.precinctNum > 0 &&
        Number.isFinite(sample.centroidLat) &&
        Number.isFinite(sample.centroidLng) &&
        Number.isFinite(sample.stationLat) &&
        Number.isFinite(sample.stationLng);

      if (hasValidSeed) {
        console.log('[DB] Already initialized');
        return;
      }

      // Rebuild corrupted seed data (older bug created precinctNum=0 / NaN centroid)
      console.warn('[DB] Detected invalid precinct seed data, rebuilding...');
      await db.transaction('rw', db.precincts, db.recentSearches, db.favorites, db.savedPlaces, async () => {
        await db.precincts.clear();
        await db.recentSearches.clear();
        await db.favorites.clear();
        await db.savedPlaces.clear();
      });
    }

    console.log('[DB] Initializing database...');

    // Load precinct data
    const precinctDataModule = await import('@/data/precinctData.json');
    const precinctBoundariesModule = await import('@/data/precinctBoundaries.json');
    const precinctLocationsModule = await import('@/data/precinctLocations.json');

    const precinctData = precinctDataModule.default;
    const precinctBoundaries = precinctBoundariesModule.default;
    const precinctLocations = precinctLocationsModule.default;

    // Transform and insert precincts
    const rawPrecincts: any[] = Array.isArray(precinctData)
      ? precinctData
      : Object.values(precinctData as Record<string, any>);

    const precincts: Precinct[] = rawPrecincts
      .map((data: any) => {
        const numInt = Number(data.precinctNum);
        if (!Number.isFinite(numInt) || numInt <= 0) return null;

        const boundaries = (precinctBoundaries as any)[String(numInt)] || [];
        const location = precinctLocations.find((p: any) => p.num === numInt);

        // Calculate bounding box
        let minLat = Infinity, maxLat = -Infinity, minLng = Infinity, maxLng = -Infinity;
        boundaries.forEach((coord: any) => {
          minLat = Math.min(minLat, coord.latitude);
          maxLat = Math.max(maxLat, coord.latitude);
          minLng = Math.min(minLng, coord.longitude);
          maxLng = Math.max(maxLng, coord.longitude);
        });

        const fallbackLat = Number(data.latitude);
        const fallbackLng = Number(data.longitude);
        const bboxCenterLat = Number.isFinite(minLat) && Number.isFinite(maxLat) ? (minLat + maxLat) / 2 : NaN;
        const bboxCenterLng = Number.isFinite(minLng) && Number.isFinite(maxLng) ? (minLng + maxLng) / 2 : NaN;
        const centroidLat = location?.lat ?? (Number.isFinite(fallbackLat) ? fallbackLat : (Number.isFinite(bboxCenterLat) ? bboxCenterLat : 0));
        const centroidLng = location?.lng ?? (Number.isFinite(fallbackLng) ? fallbackLng : (Number.isFinite(bboxCenterLng) ? bboxCenterLng : 0));

        return {
          precinctNum: numInt,
          name: data.name || `${numInt}th Precinct`,
          address: data.address || '',
          phone: data.phone || '',
          borough: data.borough || '',
          stationLat: Number.isFinite(fallbackLat) ? fallbackLat : undefined,
          stationLng: Number.isFinite(fallbackLng) ? fallbackLng : undefined,
          boundary: boundaries,
          centroidLat,
          centroidLng,
          boundingBox: {
            minLat: minLat === Infinity ? centroidLat : minLat,
            maxLat: maxLat === -Infinity ? centroidLat : maxLat,
            minLng: minLng === Infinity ? centroidLng : minLng,
            maxLng: maxLng === -Infinity ? centroidLng : maxLng,
          },
          openingHours: data.openingHours || [],
        } as Precinct;
      })
      .filter((p): p is Precinct => p !== null);

    await db.precincts.bulkAdd(precincts);
    console.log(`[DB] Loaded ${precincts.length} precincts`);

    // Load law categories
    const lawCategoriesModule = await import('@/data/lawCategories.json');
    const lawCategories = lawCategoriesModule.default;
    await db.lawCategories.bulkAdd(lawCategories);
    console.log(`[DB] Loaded ${lawCategories.length} law categories`);

    // Load law entries
    const lawEntriesModule = await import('@/data/lawEntries.json');
    const lawEntries = lawEntriesModule.default;
    await db.lawEntries.bulkAdd(lawEntries);
    console.log(`[DB] Loaded ${lawEntries.length} law entries`);

    // Load squads
    const squadsModule = await import('@/data/squads.json');
    const squads = squadsModule.default;
    await db.squads.bulkAdd(squads);
    console.log(`[DB] Loaded ${squads.length} squads`);

    // Load RDO schedules
    const rdoSchedulesModule = await import('@/data/rdoSchedules.json');
    const rdoSchedules = rdoSchedulesModule.default as RdoSchedule[];
    await db.rdoSchedules.bulkAdd(rdoSchedules);
    console.log(`[DB] Loaded ${rdoSchedules.length} RDO schedules`);

    return true;
  } catch (error) {
    console.error('[DB] Initialization error:', error);
    return false;
  }
}

// Precinct repository functions
export async function getAllPrecincts(): Promise<Precinct[]> {
  return await db.precincts.toArray();
}

export async function getPrecinctByNumber(num: number): Promise<Precinct | undefined> {
  return await db.precincts.get(num);
}

export async function findPrecinctAtLocation(point: { latitude: number; longitude: number }): Promise<Precinct | null> {
  const precincts = await db.precincts.toArray();

  for (const precinct of precincts) {
    if (isPointInPolygon(point, precinct.boundary)) {
      return precinct;
    }
  }

  return null;
}

export async function findNearestPrecinct(point: { latitude: number; longitude: number }): Promise<Precinct | null> {
  const precincts = await db.precincts.toArray();

  let nearest: Precinct | null = null;
  let minDistance = Infinity;

  for (const precinct of precincts) {
    const distance = calculateDistance(
      point.latitude,
      point.longitude,
      precinct.centroidLat,
      precinct.centroidLng
    );

    if (distance < minDistance) {
      minDistance = distance;
      nearest = precinct;
    }
  }

  return nearest;
}

// Favorites repository
export async function isFavorited(precinctNum: number): Promise<boolean> {
  const fav = await db.favorites.where('precinctNum').equals(precinctNum).first();
  return !!fav;
}

export async function upsertFavorite(precinctNum: number, label: string): Promise<void> {
  const existing = await db.favorites.where('precinctNum').equals(precinctNum).first();

  if (existing) {
    await db.favorites.update(existing.favoriteId!, { label });
  } else {
    await db.favorites.add({
      precinctNum,
      label,
      createdAt: Date.now(),
    });
  }
}

export async function removeFavorite(precinctNum: number): Promise<void> {
  await db.favorites.where('precinctNum').equals(precinctNum).delete();
}

export async function getAllFavorites(): Promise<Favorite[]> {
  return await db.favorites.orderBy('createdAt').reverse().toArray();
}

// Recent searches repository
export async function addRecentSearch(search: Omit<RecentSearch, 'searchId'>): Promise<void> {
  await db.recentSearches.add({
    ...search,
    timestamp: Date.now(),
  });

  // Keep only last 20 searches
  const all = await db.recentSearches.orderBy('timestamp').reverse().toArray();
  if (all.length > 20) {
    const toDelete = all.slice(20).map(s => s.searchId!);
    await db.recentSearches.bulkDelete(toDelete);
  }
}

export async function getRecentSearches(limit: number = 10): Promise<RecentSearch[]> {
  return await db.recentSearches.orderBy('timestamp').reverse().limit(limit).toArray();
}

export async function clearRecentSearches(): Promise<void> {
  await db.recentSearches.clear();
}

// Utility functions
function isPointInPolygon(point: { latitude: number; longitude: number }, polygon: { latitude: number; longitude: number }[]): boolean {
  let inside = false;
  const x = point.longitude;
  const y = point.latitude;

  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i].longitude;
    const yi = polygon[i].latitude;
    const xj = polygon[j].longitude;
    const yj = polygon[j].latitude;

    const intersect = ((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
    if (intersect) inside = !inside;
  }

  return inside;
}

function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth's radius in km
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRad(degrees: number): number {
  return degrees * (Math.PI / 180);
}
