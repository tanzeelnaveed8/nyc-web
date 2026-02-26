// Home/Work saved places repository
import { db } from './database';
import type { SavedPlace } from '@/types';

export async function getHome(): Promise<SavedPlace | null> {
  const place = await db.savedPlaces.get('home');
  return place || null;
}

export async function getWork(): Promise<SavedPlace | null> {
  const place = await db.savedPlaces.get('work');
  return place || null;
}

export async function setHome(place: Omit<SavedPlace, 'type'>): Promise<void> {
  await db.savedPlaces.put({ ...place, type: 'home', id: 'home' });
}

export async function setWork(place: Omit<SavedPlace, 'type'>): Promise<void> {
  await db.savedPlaces.put({ ...place, type: 'work', id: 'work' });
}

export async function clearHome(): Promise<void> {
  await db.savedPlaces.delete('home');
}

export async function clearWork(): Promise<void> {
  await db.savedPlaces.delete('work');
}
