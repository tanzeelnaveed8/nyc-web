import { NextRequest, NextResponse } from 'next/server';
import precinctData from '@/data/precinctData.json';
import precinctBoundaries from '@/data/precinctBoundaries.json';

type ChatBody = {
  message: string;
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

const ALL_PRECINCT_NUMS = [
  1, 5, 6, 7, 9, 10, 13, 14, 17, 18, 19, 20, 22, 23, 24, 25, 26, 28, 30, 32, 33, 34,
  40, 41, 42, 43, 44, 45, 46, 47, 48, 49, 50, 52,
  60, 61, 62, 63, 66, 67, 68, 69, 70, 71, 72, 73, 75, 76, 77, 78, 79, 81, 83, 84, 88, 90, 94,
  100, 101, 102, 103, 104, 105, 106, 107, 108, 109, 110, 111, 112, 113, 114, 115, 116,
  120, 121, 122,
];

const precincts: PrecinctRow[] = (precinctData as PrecinctRow[]).filter(
  (p) => Number.isFinite(p.latitude) && Number.isFinite(p.longitude),
);

// Pre-filter boundary polygons: skip building outlines (area < 1e-6 deg²).
// Real jurisdiction polygons cover blocks/neighborhoods; building outlines are ~10m.
const MIN_BOUNDARY_AREA = 1e-6;
const validBoundaries: Record<string, LatLng[]> = {};
{
  const raw = precinctBoundaries as Record<string, LatLng[]>;
  for (const [num, polygon] of Object.entries(raw)) {
    if (!Array.isArray(polygon) || polygon.length < 4) continue;
    let minLat = Infinity, maxLat = -Infinity, minLng = Infinity, maxLng = -Infinity;
    for (const p of polygon) {
      if (p.latitude < minLat) minLat = p.latitude;
      if (p.latitude > maxLat) maxLat = p.latitude;
      if (p.longitude < minLng) minLng = p.longitude;
      if (p.longitude > maxLng) maxLng = p.longitude;
    }
    const area = (maxLat - minLat) * (maxLng - minLng);
    if (area >= MIN_BOUNDARY_AREA) {
      validBoundaries[num] = polygon;
    }
  }
  console.log(`[Chat] Valid boundary polygons: ${Object.keys(validBoundaries).length} / ${Object.keys(raw).length}`);
}

const NYC_BOUNDS = {
  minLat: 40.49, maxLat: 40.92,
  minLng: -74.27, maxLng: -73.68,
};

function isInNYC(lat: number, lng: number): boolean {
  return lat >= NYC_BOUNDS.minLat && lat <= NYC_BOUNDS.maxLat &&
         lng >= NYC_BOUNDS.minLng && lng <= NYC_BOUNDS.maxLng;
}

function getApiKey(): string {
  return process.env.GOOGLE_MAPS_API_KEY || process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '';
}

function toRad(v: number): number {
  return (v * Math.PI) / 180;
}

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function isPointInPolygon(point: LatLng, polygon: LatLng[]): boolean {
  let inside = false;
  const x = point.longitude;
  const y = point.latitude;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i].longitude, yi = polygon[i].latitude;
    const xj = polygon[j].longitude, yj = polygon[j].latitude;
    if (((yi > y) !== (yj > y)) && (x < ((xj - xi) * (y - yi)) / (yj - yi) + xi)) {
      inside = !inside;
    }
  }
  return inside;
}

function extractPrecinctNum(name: string): number | null {
  const lower = name.toLowerCase();
  if (lower.includes('midtown') && lower.includes('south')) return 14;
  if (lower.includes('midtown') && lower.includes('north')) return 18;
  if (lower.includes('central park')) return 22;

  const numMatch = name.match(/(\d+)\s*(?:st|nd|rd|th)?\s*(?:precinct|pct)/i);
  if (numMatch) return parseInt(numMatch[1], 10);

  const precinctMatch = name.match(/(\d+)/);
  if (precinctMatch && lower.includes('precinct')) return parseInt(precinctMatch[1], 10);

  if (lower.includes('nypd') || lower.includes('police')) {
    const anyNum = name.match(/\b(\d{1,3})\b/);
    if (anyNum) {
      const n = parseInt(anyNum[1], 10);
      if (ALL_PRECINCT_NUMS.includes(n)) return n;
    }
  }
  return null;
}

// ── Step 1: Geocode user's text → coordinates ──

async function geocodeMessage(
  message: string,
  key: string,
): Promise<{ lat: number; lng: number; label: string } | null> {
  const queries = [message];
  if (!message.toLowerCase().includes('nyc') && !message.toLowerCase().includes('new york')) {
    queries.push(`${message}, New York City`);
  }

  for (const q of queries) {
    try {
      const params = new URLSearchParams({
        query: q,
        location: '40.7128,-74.0060',
        radius: '50000',
        key,
      });
      const res = await fetch(
        `https://maps.googleapis.com/maps/api/place/textsearch/json?${params.toString()}`,
      );
      if (res.ok) {
        const data = await res.json();
        if (data.status === 'OK' && data.results?.length) {
          const first = data.results[0];
          const lat = Number(first?.geometry?.location?.lat);
          const lng = Number(first?.geometry?.location?.lng);
          if (Number.isFinite(lat) && Number.isFinite(lng)) {
            return { lat, lng, label: first.formatted_address || first.name || message };
          }
        }
      }
    } catch { /* try next */ }
  }

  try {
    const params = new URLSearchParams({ address: `${message}, New York City`, key });
    const res = await fetch(
      `https://maps.googleapis.com/maps/api/geocode/json?${params.toString()}`,
    );
    if (res.ok) {
      const data = await res.json();
      if (data.status === 'OK' && data.results?.length) {
        const first = data.results[0];
        const lat = Number(first?.geometry?.location?.lat);
        const lng = Number(first?.geometry?.location?.lng);
        if (Number.isFinite(lat) && Number.isFinite(lng)) {
          return { lat, lng, label: first.formatted_address || message };
        }
      }
    }
  } catch { /* fall through */ }

  return null;
}

// ── Step 2a: Boundary polygon lookup (jurisdictional — most accurate) ──

function findPrecinctByBoundary(lat: number, lng: number): PrecinctRow | null {
  const point: LatLng = { latitude: lat, longitude: lng };
  for (const [num, polygon] of Object.entries(validBoundaries)) {
    if (isPointInPolygon(point, polygon)) {
      const match = precincts.find((p) => p.precinctNum === Number(num));
      if (match) return match;
    }
  }
  return null;
}

// ── Step 2b: Google Nearby Search (finds nearest precinct building) ──

async function findPrecinctByGoogleNearby(
  lat: number,
  lng: number,
  key: string,
): Promise<PrecinctRow | null> {
  const params = new URLSearchParams({
    location: `${lat},${lng}`,
    rankby: 'distance',
    keyword: 'NYPD precinct',
    key,
  });
  try {
    const res = await fetch(
      `https://maps.googleapis.com/maps/api/place/nearbysearch/json?${params.toString()}`,
    );
    if (!res.ok) return null;
    const data = await res.json();
    if (data.status !== 'OK' || !data.results?.length) return null;

    for (const place of data.results) {
      const num = extractPrecinctNum(place.name);
      if (num !== null && ALL_PRECINCT_NUMS.includes(num)) {
        const match = precincts.find((p) => p.precinctNum === num);
        if (match) return match;
      }
    }
  } catch { /* fall through */ }
  return null;
}

// ── Step 2c: Nearest precinct station by distance ──

function findNearestPrecinctByDistance(lat: number, lng: number): PrecinctRow | null {
  if (!precincts.length) return null;
  let best = precincts[0];
  let bestDist = haversineKm(lat, lng, best.latitude, best.longitude);
  for (let i = 1; i < precincts.length; i++) {
    const d = haversineKm(lat, lng, precincts[i].latitude, precincts[i].longitude);
    if (d < bestDist) {
      bestDist = d;
      best = precincts[i];
    }
  }
  return best;
}

// ── Resolve: Boundary (jurisdiction) → Google Nearby → Nearest distance ──

async function resolvePrecinctForCoords(
  lat: number,
  lng: number,
  key: string,
): Promise<{ precinct: PrecinctRow; method: string } | null> {
  const boundary = findPrecinctByBoundary(lat, lng);
  if (boundary) {
    console.log(`[Chat] ✓ Boundary match: Precinct ${boundary.precinctNum}`);
    return { precinct: boundary, method: 'boundary' };
  }

  if (key) {
    const nearby = await findPrecinctByGoogleNearby(lat, lng, key);
    if (nearby) {
      console.log(`[Chat] ✓ Google Nearby: Precinct ${nearby.precinctNum}`);
      return { precinct: nearby, method: 'google-nearby' };
    }
  }

  const nearest = findNearestPrecinctByDistance(lat, lng);
  if (nearest) {
    console.log(`[Chat] ✓ Nearest distance: Precinct ${nearest.precinctNum}`);
    return { precinct: nearest, method: 'nearest-distance' };
  }

  return null;
}

// ── Drive distance/time ──

async function getDriveMetrics(
  oLat: number, oLng: number, dLat: number, dLng: number, key: string,
): Promise<{ distanceText: string; durationText: string } | null> {
  if (!key) return null;
  try {
    const params = new URLSearchParams({
      origins: `${oLat},${oLng}`,
      destinations: `${dLat},${dLng}`,
      mode: 'driving',
      units: 'imperial',
      key,
    });
    const res = await fetch(
      `https://maps.googleapis.com/maps/api/distancematrix/json?${params.toString()}`,
    );
    if (!res.ok) return null;
    const data = await res.json();
    const el = data?.rows?.[0]?.elements?.[0];
    if (!el || el.status !== 'OK') return null;
    return {
      distanceText: el?.distance?.text || '',
      durationText: el?.duration?.text || '',
    };
  } catch {
    return null;
  }
}

// ── Build response ──

async function formatPrecinctResponse(
  sourceLabel: string,
  precinct: PrecinctRow,
  fromLat: number,
  fromLng: number,
  key: string,
): Promise<string> {
  const drive = await getDriveMetrics(fromLat, fromLng, precinct.latitude, precinct.longitude, key);
  const straightKm = haversineKm(fromLat, fromLng, precinct.latitude, precinct.longitude);
  const straightMi = straightKm * 0.621371;

  const lines = [
    `Nearest precinct for "${sourceLabel}":`,
    ``,
    `🏛 ${precinct.name}`,
    `   Precinct #${precinct.precinctNum}`,
    `📍 ${precinct.address}`,
    `🏘 Borough: ${precinct.borough}`,
    precinct.phone ? `📞 ${precinct.phone}` : '',
    ``,
    drive?.distanceText && drive?.durationText
      ? `🚗 ${drive.distanceText} away (approx. ${drive.durationText} drive)`
      : `📏 ${straightMi.toFixed(1)} miles (${straightKm.toFixed(1)} km) away`,
  ];

  return lines.filter(Boolean).join('\n');
}

function isGreeting(msg: string): boolean {
  return /^(hi|hello|hey|salam|aoa|assalam|yo|sup|hlo|hii+|kya hal|suno|help|start)[\s!.?]*$/i.test(msg);
}

// ═══════════════════ POST handler ═══════════════════

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as ChatBody;
    const message = body.message?.trim();
    if (!message) {
      return NextResponse.json({ message: 'Please enter a message.' }, { status: 400 });
    }

    const key = getApiKey();
    const userLat = Number(body.latitude);
    const userLng = Number(body.longitude);
    const hasGps = Number.isFinite(userLat) && Number.isFinite(userLng);

    console.log(`[Chat] Message: "${message}", GPS: ${hasGps ? `${userLat},${userLng}` : 'none'}`);

    const gpsInNYC = hasGps && isInNYC(userLat, userLng);

    // Greetings
    if (isGreeting(message)) {
      if (gpsInNYC) {
        const result = await resolvePrecinctForCoords(userLat, userLng, key);
        if (result) {
          const response = await formatPrecinctResponse(
            'your current location', result.precinct, userLat, userLng, key,
          );
          return NextResponse.json({ message: response });
        }
      }
      return NextResponse.json({
        message: hasGps && !gpsInNYC
          ? 'Hello! It looks like you\'re not in NYC right now. Type any NYC location and I\'ll find the nearest precinct.\n\nFor example:\n• "Times Square"\n• "Brooklyn Bridge"\n• "123 Main Street, Bronx"'
          : 'Hello! Tell me your location and I\'ll find the nearest precinct for you.\n\nFor example:\n• "Times Square"\n• "Brooklyn Bridge"\n• "123 Main Street, Bronx"',
      });
    }

    // "My current location" type messages → use GPS
    if (/\b(my\s+location|current\s+location|my\s+current|gps|where\s+i\s+am)\b/i.test(message)) {
      if (gpsInNYC) {
        const result = await resolvePrecinctForCoords(userLat, userLng, key);
        if (result) {
          const response = await formatPrecinctResponse(
            'your current location', result.precinct, userLat, userLng, key,
          );
          return NextResponse.json({ message: response });
        }
      }
      if (hasGps && !gpsInNYC) {
        return NextResponse.json({
          message: 'Your current location is outside New York City. NYPD precincts are only in NYC.\n\nPlease type an NYC location instead, e.g. "Times Square" or "Brooklyn Bridge".',
        });
      }
    }

    // Main flow: geocode the message, then resolve precinct
    let targetLat: number | null = null;
    let targetLng: number | null = null;
    let sourceLabel = '';

    if (key) {
      const geo = await geocodeMessage(message, key);
      if (geo) {
        targetLat = geo.lat;
        targetLng = geo.lng;
        sourceLabel = geo.label;
        console.log(`[Chat] Geocoded → ${geo.lat.toFixed(6)}, ${geo.lng.toFixed(6)} (${geo.label})`);
      }
    }

    // If geocoded location is outside NYC, reject it
    if (targetLat !== null && targetLng !== null && !isInNYC(targetLat, targetLng)) {
      console.log(`[Chat] Geocoded location is outside NYC: ${targetLat}, ${targetLng}`);
      targetLat = null;
      targetLng = null;
    }

    if (targetLat === null && gpsInNYC) {
      targetLat = userLat;
      targetLng = userLng;
      sourceLabel = 'your current location';
    }

    if (targetLat === null || targetLng === null) {
      return NextResponse.json({
        message: 'I couldn\'t find that location in NYC. Please try a specific NYC place name.\n\nExamples:\n• "Times Square"\n• "Central Park"\n• "Wall Street, Manhattan"',
      });
    }

    const result = await resolvePrecinctForCoords(targetLat, targetLng, key);

    if (!result) {
      return NextResponse.json({
        message: 'Sorry, I could not determine the nearest precinct for that location.',
      });
    }

    const response = await formatPrecinctResponse(sourceLabel, result.precinct, targetLat, targetLng, key);
    return NextResponse.json({ message: response });
  } catch (error) {
    console.error('[API] Chat error:', error);
    return NextResponse.json(
      { message: 'Something went wrong. Please try again.' },
      { status: 500 },
    );
  }
}
