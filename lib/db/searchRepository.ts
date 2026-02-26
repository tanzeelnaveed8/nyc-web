// Search repository for recent searches
import { db } from './database';
import type { RecentSearch } from '@/types';

export async function getRecentSearches(limit: number = 10): Promise<RecentSearch[]> {
  try {
    const searches = await db.recentSearches
      .orderBy('timestamp')
      .reverse()
      .limit(limit)
      .toArray();
    return searches;
  } catch (error) {
    console.error('[SearchRepo] Get recent searches error:', error);
    return [];
  }
}

export async function addRecentSearch(search: Omit<RecentSearch, 'searchId'>): Promise<void> {
  try {
    await db.recentSearches.add(search as RecentSearch);
  } catch (error) {
    console.error('[SearchRepo] Add recent search error:', error);
  }
}

export async function clearRecentSearches(): Promise<void> {
  try {
    await db.recentSearches.clear();
  } catch (error) {
    console.error('[SearchRepo] Clear recent searches error:', error);
  }
}

export async function removeRecentSearch(searchId: number): Promise<void> {
  try {
    await db.recentSearches.delete(searchId);
  } catch (error) {
    console.error('[SearchRepo] Remove recent search error:', error);
  }
}
