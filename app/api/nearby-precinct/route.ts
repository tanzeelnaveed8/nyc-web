import { NextRequest, NextResponse } from 'next/server';

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

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const lat = searchParams.get('lat');
    const lng = searchParams.get('lng');

    if (!lat || !lng) {
      return NextResponse.json({ error: 'Missing lat or lng' }, { status: 400 });
    }

    const params = new URLSearchParams({
      location: `${lat},${lng}`,
      rankby: 'distance',
      keyword: 'NYPD precinct',
      key: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '',
    });

    const url = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?${params.toString()}`;
    const response = await fetch(url);

    if (!response.ok) {
      return NextResponse.json({ precinctNum: null });
    }

    const data = await response.json();

    if (data.status !== 'OK' || !data.results?.length) {
      return NextResponse.json({ precinctNum: null });
    }

    // Find the first result that looks like a precinct
    for (const place of data.results) {
      const num = extractPrecinctNum(place.name);
      if (num !== null && ALL_PRECINCT_NUMS.includes(num)) {
        return NextResponse.json({ precinctNum: num });
      }
    }

    return NextResponse.json({ precinctNum: null });
  } catch (error) {
    console.error('[API] Nearby precinct error:', error);
    return NextResponse.json({ precinctNum: null });
  }
}
