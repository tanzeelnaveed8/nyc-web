// Google Places Nearby Search to find NYPD precinct
const GOOGLE_MAPS_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '';

const ALL_PRECINCT_NUMS = [
  1,5,6,7,9,10,13,14,17,18,19,20,22,23,24,25,26,28,30,32,33,34,
  40,41,42,43,44,45,46,47,48,49,50,52,
  60,61,62,63,66,67,68,69,70,71,72,73,75,76,77,78,79,81,83,84,88,90,94,
  100,101,102,103,104,105,106,107,108,109,110,111,112,113,114,115,116,
  120,121,122,
];

/**
 * Find the nearest NYPD precinct to a given location using Google Places Nearby Search.
 * Returns the precinct number if found.
 */
export async function findNearbyNYPDPrecinct(
  latitude: number,
  longitude: number,
): Promise<number | null> {
  try {
    const params = new URLSearchParams({
      location: `${latitude},${longitude}`,
      rankby: 'distance',
      keyword: 'NYPD precinct',
      key: GOOGLE_MAPS_KEY,
    });

    const url = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?${params.toString()}`;
    const response = await fetch(url);
    if (!response.ok) return null;

    const data = await response.json();
    if (data.status !== 'OK' || !data.results?.length) return null;

    // Find the first result that looks like a precinct
    for (const place of data.results) {
      const num = extractPrecinctNum(place.name);
      if (num !== null && ALL_PRECINCT_NUMS.includes(num)) {
        console.log('[findNearbyNYPDPrecinct] Found precinct:', num, 'from place:', place.name);
        return num;
      }
    }

    return null;
  } catch (err) {
    console.warn('[findNearbyNYPDPrecinct] Google Nearby Search failed:', err);
    return null;
  }
}

/**
 * Extract precinct number from a place name.
 */
function extractPrecinctNum(name: string): number | null {
  const lower = name.toLowerCase();

  // Special named precincts
  if (lower.includes('midtown') && lower.includes('south')) return 14;
  if (lower.includes('midtown') && lower.includes('north')) return 18;
  if (lower.includes('central park')) return 22;

  // Standard: any number followed by optional ordinal + "precinct"
  const numMatch = name.match(/(\d+)\s*(?:st|nd|rd|th)?\s*(?:precinct|pct)/i);
  if (numMatch) return parseInt(numMatch[1], 10);

  // "NYPD 28th Precinct" style
  const precinctMatch = name.match(/(\d+)/);
  if (precinctMatch && lower.includes('precinct')) {
    return parseInt(precinctMatch[1], 10);
  }

  // Fallback: just a number in NYPD/police context
  if (lower.includes('nypd') || lower.includes('police')) {
    const anyNum = name.match(/\b(\d{1,3})\b/);
    if (anyNum) {
      const n = parseInt(anyNum[1], 10);
      if (ALL_PRECINCT_NUMS.includes(n)) return n;
    }
  }

  return null;
}
