import { NextRequest, NextResponse } from 'next/server';
import precinctData from '@/data/precinctData.json';
import precinctBoundaries from '@/data/precinctBoundaries.json';

type ChatBody = {
  message?: string;
  latitude?: number;
  longitude?: number;
};

type PrecinctRow = {
  precinctNum: number;
  name: string;
  borough: string;
  address: string;
  phone?: string;
  latitude: number;
  longitude: number;
};

type LatLng = { latitude: number; longitude: number };
type NearbyPrecinctPlace = {
  name: string;
  address: string;
  latitude: number;
  longitude: number;
};

const precincts: PrecinctRow[] = (precinctData as PrecinctRow[]).filter(
  (p) => Number.isFinite(p.latitude) && Number.isFinite(p.longitude)
);

function getMapsServerKey(): string {
  return process.env.GOOGLE_MAPS_API_KEY || process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '';
}

function toRad(value: number): number {
  return (value * Math.PI) / 180;
}

function isPointInPolygon(point: LatLng, polygon: LatLng[]): boolean {
  let inside = false;
  const x = point.longitude;
  const y = point.latitude;

  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i].longitude;
    const yi = polygon[i].latitude;
    const xj = polygon[j].longitude;
    const yj = polygon[j].latitude;
    const intersect = ((yi > y) !== (yj > y)) && (x < ((xj - xi) * (y - yi)) / (yj - yi) + xi);
    if (intersect) inside = !inside;
  }

  return inside;
}

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function findNearestPrecinct(lat: number, lng: number): { precinct: PrecinctRow; distanceKm: number } | null {
  if (!precincts.length) return null;
  let best = precincts[0];
  let bestDistance = haversineKm(lat, lng, best.latitude, best.longitude);

  for (let i = 1; i < precincts.length; i += 1) {
    const candidate = precincts[i];
    const d = haversineKm(lat, lng, candidate.latitude, candidate.longitude);
    if (d < bestDistance) {
      bestDistance = d;
      best = candidate;
    }
  }

  return { precinct: best, distanceKm: bestDistance };
}

function extractPlaceQuery(message: string): string | null {
  const cleaned = message.trim();
  const patterns = [
    /\b(?:distance|far|nearest|near)\s+(?:to|from)?\s*([a-z0-9][a-z0-9\s,'.-]{2,80})$/i,
    /\b(?:at|in|near|from)\s+([a-z0-9][a-z0-9\s,'.-]{2,80})$/i,
  ];

  for (const pattern of patterns) {
    const match = cleaned.match(pattern);
    if (match?.[1]) {
      return match[1].trim();
    }
  }

  return null;
}

async function geocodePlace(query: string): Promise<{ latitude: number; longitude: number; label: string } | null> {
  const key = getMapsServerKey();
  if (!key) return null;

  const params = new URLSearchParams({
    address: query,
    key,
  });

  const res = await fetch(`https://maps.googleapis.com/maps/api/geocode/json?${params.toString()}`);
  if (!res.ok) return null;
  const data = await res.json();
  if (data.status !== 'OK' || !data.results?.length) return null;

  const first = data.results[0];
  const lat = Number(first?.geometry?.location?.lat);
  const lng = Number(first?.geometry?.location?.lng);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;

  return {
    latitude: lat,
    longitude: lng,
    label: first.formatted_address || query,
  };
}

async function textSearchPlace(query: string): Promise<{ latitude: number; longitude: number; label: string } | null> {
  const key = getMapsServerKey();
  if (!key) return null;

  const params = new URLSearchParams({
    query,
    location: '40.7128,-74.0060',
    radius: '50000',
    key,
  });

  const response = await fetch(`https://maps.googleapis.com/maps/api/place/textsearch/json?${params.toString()}`);
  if (!response.ok) return null;
  const data = await response.json();
  if (data.status !== 'OK' || !data.results?.length) return null;

  const first = data.results[0];
  const lat = Number(first?.geometry?.location?.lat);
  const lng = Number(first?.geometry?.location?.lng);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;

  return {
    latitude: lat,
    longitude: lng,
    label: first.formatted_address || first.name || query,
  };
}

async function resolvePlaceFromSearchApi(
  origin: string,
  query: string
): Promise<{ latitude: number; longitude: number; label: string } | null> {
  const res = await fetch(`${origin}/api/place-search?q=${encodeURIComponent(query)}`);
  if (!res.ok) return null;
  const data = await res.json();
  const result = data?.result;
  const lat = Number(result?.latitude);
  const lng = Number(result?.longitude);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  return {
    latitude: lat,
    longitude: lng,
    label: result?.address || result?.name || query,
  };
}

async function resolvePlaceFromMessage(
  origin: string,
  message: string
): Promise<{ latitude: number; longitude: number; label: string } | null> {
  const extracted = extractPlaceQuery(message);
  const candidates = [extracted, message]
    .filter((v): v is string => !!v && v.trim().length >= 3)
    .map((v) => v.trim())
    .filter((v, i, arr) => arr.indexOf(v) === i)
    .slice(0, 2);

  for (const candidate of candidates) {
    const searchApiResult = await resolvePlaceFromSearchApi(origin, candidate);
    if (searchApiResult) return searchApiResult;
    const textResult = await textSearchPlace(candidate);
    if (textResult) return textResult;
    const geocodeResult = await geocodePlace(candidate);
    if (geocodeResult) return geocodeResult;
  }

  return null;
}

async function resolveNearbyPrecinctFromApi(origin: string, lat: number, lng: number): Promise<number | null> {
  const res = await fetch(`${origin}/api/nearby-precinct?lat=${lat}&lng=${lng}`);
  if (!res.ok) return null;
  const data = await res.json();
  const precinctNum = Number(data?.precinctNum);
  return Number.isFinite(precinctNum) ? precinctNum : null;
}

async function searchNearbyPrecinctPlaces(
  lat: number,
  lng: number,
  limit: number = 3
): Promise<NearbyPrecinctPlace[]> {
  const key = getMapsServerKey();
  if (!key) return [];

  const params = new URLSearchParams({
    location: `${lat},${lng}`,
    rankby: 'distance',
    keyword: 'NYPD precinct',
    key,
  });

  const res = await fetch(`https://maps.googleapis.com/maps/api/place/nearbysearch/json?${params.toString()}`);
  if (!res.ok) return [];
  const data = await res.json();
  if (data.status !== 'OK' || !Array.isArray(data.results)) return [];

  return data.results
    .map((place: any) => {
      const pLat = Number(place?.geometry?.location?.lat);
      const pLng = Number(place?.geometry?.location?.lng);
      if (!Number.isFinite(pLat) || !Number.isFinite(pLng)) return null;
      return {
        name: String(place?.name || 'NYPD Precinct'),
        address: String(place?.vicinity || place?.formatted_address || 'Address unavailable'),
        latitude: pLat,
        longitude: pLng,
      } as NearbyPrecinctPlace;
    })
    .filter((p: NearbyPrecinctPlace | null): p is NearbyPrecinctPlace => p !== null)
    .slice(0, limit);
}

function findPrecinctByBoundary(lat: number, lng: number): PrecinctRow | null {
  const point: LatLng = { latitude: lat, longitude: lng };
  const boundaries = precinctBoundaries as Record<string, LatLng[]>;
  for (const [num, polygon] of Object.entries(boundaries)) {
    if (!Array.isArray(polygon) || polygon.length < 3) continue;
    if (isPointInPolygon(point, polygon)) {
      const precinctNum = Number(num);
      const match = precincts.find((p) => p.precinctNum === precinctNum);
      if (match) return match;
    }
  }
  return null;
}

async function getDriveMetrics(
  originLat: number,
  originLng: number,
  destLat: number,
  destLng: number
): Promise<{
  distanceText: string;
  distanceKm: number | null;
  durationText: string;
  durationMin: number | null;
} | null> {
  const key = getMapsServerKey();
  if (!key) return null;

  const params = new URLSearchParams({
    origins: `${originLat},${originLng}`,
    destinations: `${destLat},${destLng}`,
    mode: 'driving',
    units: 'imperial',
    key,
  });

  const res = await fetch(`https://maps.googleapis.com/maps/api/distancematrix/json?${params.toString()}`);
  if (!res.ok) return null;
  const data = await res.json();
  const element = data?.rows?.[0]?.elements?.[0];
  if (!element || element.status !== 'OK') return null;

  const meters = Number(element?.distance?.value);
  const seconds = Number(element?.duration?.value);

  return {
    distanceText: element?.distance?.text || '',
    distanceKm: Number.isFinite(meters) ? meters / 1000 : null,
    durationText: element?.duration?.text || '',
    durationMin: Number.isFinite(seconds) ? Math.round(seconds / 60) : null,
  };
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as ChatBody;
    const message = body.message?.trim();
    if (!message) {
      return NextResponse.json({ message: 'Please enter a message.' }, { status: 400 });
    }

    const userLat = Number(body.latitude);
    const userLng = Number(body.longitude);
    const hasUserLocation = Number.isFinite(userLat) && Number.isFinite(userLng);

    const origin = request.nextUrl.origin;
    const place = await resolvePlaceFromMessage(origin, message);

    const targetLat = place?.latitude ?? (hasUserLocation ? userLat : null);
    const targetLng = place?.longitude ?? (hasUserLocation ? userLng : null);

    if (targetLat === null || targetLng === null) {
      return NextResponse.json({
        message:
          'I can help with precinct distance. Share a place name (for example: "Times Square") or enable location access.',
      });
    }

    const sourceLabel = place ? place.label : 'your current location';
    const nearbyPlaces = await searchNearbyPrecinctPlaces(targetLat, targetLng, 3);

    if (nearbyPlaces.length > 0) {
      const lines: string[] = [`I found these nearby precincts for ${sourceLabel}:`];
      for (let i = 0; i < nearbyPlaces.length; i += 1) {
        const p = nearbyPlaces[i];
        const drive = await getDriveMetrics(targetLat, targetLng, p.latitude, p.longitude);
        const straightKm = haversineKm(targetLat, targetLng, p.latitude, p.longitude);
        const straightMi = straightKm * 0.621371;
        const distanceLine =
          drive?.distanceText && drive?.durationText
            ? `${drive.distanceText} (about ${drive.durationText} drive)`
            : `${straightKm.toFixed(2)} km (${straightMi.toFixed(2)} mi) approx`;

        lines.push(`${i + 1}. **${p.name}**`);
        lines.push(`   Address: ${p.address}`);
        lines.push(`   Distance: ${distanceLine}`);
      }

      return NextResponse.json({ message: lines.join('\n') });
    }

    // Final fallback when Google Nearby returns no precinct places.
    const nearbyPrecinctNum = await resolveNearbyPrecinctFromApi(origin, targetLat, targetLng);
    const nearbyPrecinct = nearbyPrecinctNum ? precincts.find((p) => p.precinctNum === nearbyPrecinctNum) || null : null;
    const boundaryPrecinct = findPrecinctByBoundary(targetLat, targetLng);
    const fallbackNearest = findNearestPrecinct(targetLat, targetLng);
    const nearestPrecinct = nearbyPrecinct || boundaryPrecinct || fallbackNearest?.precinct || null;

    if (!nearestPrecinct) {
      return NextResponse.json({ message: 'No nearby precinct found from Google Maps for this place.' });
    }

    const drive = await getDriveMetrics(targetLat, targetLng, nearestPrecinct.latitude, nearestPrecinct.longitude);
    const straightKm = haversineKm(targetLat, targetLng, nearestPrecinct.latitude, nearestPrecinct.longitude);
    const straightMi = straightKm * 0.621371;

    const responseMessage = [
      `Nearest precinct for ${sourceLabel} is **${nearestPrecinct.name}** (Precinct ${nearestPrecinct.precinctNum}).`,
      `Address: ${nearestPrecinct.address}`,
      drive?.distanceText && drive?.durationText
        ? `Distance: ${drive.distanceText} (about ${drive.durationText} drive).`
        : `Distance: ${straightKm.toFixed(2)} km (${straightMi.toFixed(2)} mi) approx.`,
    ].join('\n');

    return NextResponse.json({ message: responseMessage });
  } catch (error) {
    console.error('[API] Chat error:', error);
    return NextResponse.json(
      { message: 'I hit an error while processing your request. Please try again.' },
      { status: 500 }
    );
  }
}
