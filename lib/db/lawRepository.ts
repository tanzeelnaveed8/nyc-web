// Law repository functions
import { db } from './database';
import type { LawCategory, LawEntry } from '@/types';

export async function getAllCategories(): Promise<LawCategory[]> {
  return await db.lawCategories.orderBy('displayOrder').toArray();
}

export async function getEntriesByCategory(categoryId: string): Promise<LawEntry[]> {
  return await db.lawEntries.where('categoryId').equals(categoryId).toArray();
}

export async function getEntryById(entryId: number): Promise<LawEntry | undefined> {
  return await db.lawEntries.get(entryId);
}

export async function searchLaws(query: string): Promise<LawEntry[]> {
  if (!query || query.trim().length === 0) return [];

  const sanitized = query.toLowerCase().trim();
  const allEntries = await db.lawEntries.toArray();

  return allEntries.filter(entry =>
    entry.title.toLowerCase().includes(sanitized) ||
    entry.bodyText.toLowerCase().includes(sanitized) ||
    entry.sectionNumber.toLowerCase().includes(sanitized)
  ).slice(0, 50);
}

export async function getLawStats(): Promise<{ categories: number; entries: number }> {
  const categories = await db.lawCategories.count();
  const entries = await db.lawEntries.count();
  return { categories, entries };
}
