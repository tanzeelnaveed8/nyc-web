// Utility functions for geolocation and geocoding
import type { LatLng } from '@/types';

const NYC_BOUNDS = {
  minLat: 40.49,
  maxLat: 40.92,
  minLng: -74.26,
  maxLng: -73.70,
};

function isWithinNYC(lat: number, lng: number): boolean {
  return (
    lat >= NYC_BOUNDS.minLat &&
    lat <= NYC_BOUNDS.maxLat &&
    lng >= NYC_BOUNDS.minLng &&
    lng <= NYC_BOUNDS.maxLng
  );
}

export async function reverseGeocode(lat: number, lng: number): Promise<string | null> {
  try {
    const response = await fetch(
      `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}`
    );
    const data = await response.json();

    if (data.results && data.results.length > 0) {
      return data.results[0].formatted_address;
    }

    return null;
  } catch (error) {
    console.error('[Geocode] Reverse geocode error:', error);
    return null;
  }
}

export async function geocodeAddress(address: string): Promise<LatLng | null> {
  try {
    const nycQuery = address.toLowerCase().includes('new york') ? address : `${address}, New York City, NY`;
    const response = await fetch(
      `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(nycQuery)}&bounds=40.49,-74.26|40.92,-73.70&components=country:US|administrative_area:NY&key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}`
    );
    const data = await response.json();

    if (data.results && data.results.length > 0) {
      const nycResult = data.results.find((result: any) => {
        const loc = result?.geometry?.location;
        if (!loc) return false;
        return isWithinNYC(loc.lat, loc.lng);
      }) || data.results[0];

      const location = nycResult.geometry.location;
      if (!isWithinNYC(location.lat, location.lng)) {
        return null;
      }

      return {
        latitude: location.lat,
        longitude: location.lng,
      };
    }

    return null;
  } catch (error) {
    console.error('[Geocode] Geocode error:', error);
    return null;
  }
}

const ALL_PRECINCT_NUMS = [
  1,5,6,7,9,10,13,14,17,18,19,20,22,23,24,25,26,28,30,32,33,34,
  40,41,42,43,44,45,46,47,48,49,50,52,
  60,61,62,63,66,67,68,69,70,71,72,73,75,76,77,78,79,81,83,84,88,90,94,
  100,101,102,103,104,105,106,107,108,109,110,111,112,113,114,115,116,
  120,121,122,
];

function extractPrecinctNum(name: string): number | null {
  const lower = name.toLowerCase();

  if (lower.includes('midtown') && lower.includes('south')) return 14;
  if (lower.includes('midtown') && lower.includes('north')) return 18;
  if (lower.includes('central park')) return 22;

  const numMatch = name.match(/(\d+)\s*(?:st|nd|rd|th)?\s*(?:precinct|pct)/i);
  if (numMatch) return parseInt(numMatch[1], 10);

  const precinctMatch = name.match(/(\d+)/);
  if (precinctMatch && lower.includes('precinct')) {
    return parseInt(precinctMatch[1], 10);
  }

  if (lower.includes('nypd') || lower.includes('police')) {
    const anyNum = name.match(/\b(\d{1,3})\b/);
    if (anyNum) {
      const n = parseInt(anyNum[1], 10);
      if (ALL_PRECINCT_NUMS.includes(n)) return n;
    }
  }

  return null;
}

export async function findNearbyNYPDPrecinct(lat: number, lng: number): Promise<number | null> {
  try {
    // Call our API route instead of Google directly (to avoid CORS)
    const response = await fetch(`/api/nearby-precinct?lat=${lat}&lng=${lng}`);
    if (!response.ok) return null;

    const data = await response.json();
    return data.precinctNum || null;
  } catch (error) {
    console.error('[API] Find nearby precinct error:', error);
    return null;
  }
}

export function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
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

export function getCurrentLocation(): Promise<GeolocationPosition> {
  const requestLocation = (options: PositionOptions) =>
    new Promise<GeolocationPosition>((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(resolve, reject, options);
    });

  return new Promise(async (resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation is not supported by your browser'));
      return;
    }

    try {
      // First try: accurate GPS
      const accurate = await requestLocation({
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 120000,
      });
      resolve(accurate);
      return;
    } catch {
      // Fallback: allow cached / lower-accuracy location (faster on desktop)
      try {
        const fallback = await requestLocation({
          enableHighAccuracy: false,
          timeout: 10000,
          maximumAge: 10 * 60 * 1000,
        });
        resolve(fallback);
        return;
      } catch (error: any) {
        let errorMessage = 'Unable to get your location';
        switch (error?.code) {
          case 1:
            errorMessage = 'Location permission denied. Please enable location access in your browser settings.';
            break;
          case 2:
            errorMessage = 'Location information is unavailable. Please check your device settings.';
            break;
          case 3:
            errorMessage = 'Location request timed out. Please try again.';
            break;
          default:
            errorMessage = 'An unknown error occurred while getting your location.';
        }
        reject(new Error(errorMessage));
      }
    }
  });
}

export async function checkLocationPermission(): Promise<'granted' | 'denied' | 'prompt'> {
  if (!navigator.permissions) {
    return 'prompt';
  }

  try {
    const result = await navigator.permissions.query({ name: 'geolocation' as PermissionName });
    return result.state as 'granted' | 'denied' | 'prompt';
  } catch {
    return 'prompt';
  }
}
