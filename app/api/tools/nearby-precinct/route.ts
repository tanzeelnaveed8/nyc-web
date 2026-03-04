import { NextRequest, NextResponse } from 'next/server';

type NearbyPrecinctItem = {
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  distanceText: string | null;
  durationText: string | null;
};

function getGoogleApiKey(): string {
  return process.env.GOOGLE_MAPS_API_KEY || process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '';
}

async function resolvePlaceWithGoogle(place: string, key: string): Promise<{
  label: string;
  latitude: number;
  longitude: number;
} | null> {
  const textParams = new URLSearchParams({
    query: place,
    location: '40.7128,-74.0060',
    radius: '50000',
    key,
  });
  const textRes = await fetch(
    `https://maps.googleapis.com/maps/api/place/textsearch/json?${textParams.toString()}`
  );
  if (textRes.ok) {
    const textData = await textRes.json();
    if (textData.status === 'OK' && Array.isArray(textData.results) && textData.results.length > 0) {
      const first = textData.results[0];
      const lat = Number(first?.geometry?.location?.lat);
      const lng = Number(first?.geometry?.location?.lng);
      if (Number.isFinite(lat) && Number.isFinite(lng)) {
        return {
          label: first?.formatted_address || first?.name || place,
          latitude: lat,
          longitude: lng,
        };
      }
    }
  }

  const geoParams = new URLSearchParams({
    address: place,
    key,
  });
  const geoRes = await fetch(`https://maps.googleapis.com/maps/api/geocode/json?${geoParams.toString()}`);
  if (!geoRes.ok) return null;
  const geoData = await geoRes.json();
  if (geoData.status !== 'OK' || !Array.isArray(geoData.results) || geoData.results.length === 0) return null;

  const first = geoData.results[0];
  const lat = Number(first?.geometry?.location?.lat);
  const lng = Number(first?.geometry?.location?.lng);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;

  return {
    label: first?.formatted_address || place,
    latitude: lat,
    longitude: lng,
  };
}

async function nearbyPrecinctsByGoogle(
  latitude: number,
  longitude: number,
  key: string,
  limit: number
): Promise<NearbyPrecinctItem[]> {
  const nearbyParams = new URLSearchParams({
    location: `${latitude},${longitude}`,
    rankby: 'distance',
    keyword: 'NYPD precinct',
    key,
  });

  const nearbyRes = await fetch(
    `https://maps.googleapis.com/maps/api/place/nearbysearch/json?${nearbyParams.toString()}`
  );
  if (!nearbyRes.ok) return [];
  const nearbyData = await nearbyRes.json();
  if (nearbyData.status !== 'OK' || !Array.isArray(nearbyData.results)) return [];

  const precincts: NearbyPrecinctItem[] = nearbyData.results
    .map((p: any) => {
      const lat = Number(p?.geometry?.location?.lat);
      const lng = Number(p?.geometry?.location?.lng);
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
      return {
        name: String(p?.name || 'NYPD Precinct'),
        address: String(p?.vicinity || p?.formatted_address || 'Address unavailable'),
        latitude: lat,
        longitude: lng,
        distanceText: null,
        durationText: null,
      } as NearbyPrecinctItem;
    })
    .filter((p: NearbyPrecinctItem | null): p is NearbyPrecinctItem => p !== null)
    .slice(0, Math.max(1, Math.min(limit, 5)));

  if (!precincts.length) return [];

  const destinations = precincts.map((p) => `${p.latitude},${p.longitude}`).join('|');
  const matrixParams = new URLSearchParams({
    origins: `${latitude},${longitude}`,
    destinations,
    mode: 'driving',
    units: 'imperial',
    key,
  });
  const matrixRes = await fetch(
    `https://maps.googleapis.com/maps/api/distancematrix/json?${matrixParams.toString()}`
  );

  if (matrixRes.ok) {
    const matrixData = await matrixRes.json();
    const elements = matrixData?.rows?.[0]?.elements;
    if (Array.isArray(elements)) {
      precincts.forEach((p, i) => {
        const el = elements[i];
        if (el?.status === 'OK') {
          p.distanceText = el?.distance?.text || null;
          p.durationText = el?.duration?.text || null;
        }
      });
    }
  }

  return precincts;
}

export async function GET(request: NextRequest) {
  try {
    const place = request.nextUrl.searchParams.get('place')?.trim();
    const limitParam = Number(request.nextUrl.searchParams.get('limit'));
    const limit = Number.isFinite(limitParam) ? limitParam : 3;

    if (!place) {
      return NextResponse.json({ error: 'Missing place query parameter' }, { status: 400 });
    }

    const key = getGoogleApiKey();
    if (!key) {
      return NextResponse.json({ error: 'Google API key is missing on server' }, { status: 500 });
    }

    const resolved = await resolvePlaceWithGoogle(place, key);
    if (!resolved) {
      return NextResponse.json({
        place,
        resolvedPlace: null,
        precincts: [],
      });
    }

    const precincts = await nearbyPrecinctsByGoogle(resolved.latitude, resolved.longitude, key, limit);

    return NextResponse.json({
      place,
      resolvedPlace: resolved,
      precincts,
    });
  } catch (error) {
    console.error('[Tool] Nearby precinct search error:', error);
    return NextResponse.json({ error: 'Failed to search nearby precincts' }, { status: 500 });
  }
}
