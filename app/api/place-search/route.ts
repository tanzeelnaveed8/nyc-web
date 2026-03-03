import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const q = request.nextUrl.searchParams.get('q')?.trim();
    if (!q) {
      return NextResponse.json({ result: null }, { status: 400 });
    }

    const key = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '';
    if (!key) {
      return NextResponse.json({ result: null });
    }

    const query = q;
    const params = new URLSearchParams({
      query,
      location: '40.7128,-74.0060',
      radius: '50000',
      key,
    });

    const response = await fetch(
      `https://maps.googleapis.com/maps/api/place/textsearch/json?${params.toString()}`
    );
    if (response.ok) {
      const data = await response.json();
      if (data.status === 'OK' && data.results?.length) {
        const first = data.results[0];
        const loc = first?.geometry?.location;
        if (loc) {
          const lat = Number(loc.lat);
          const lng = Number(loc.lng);
          if (Number.isFinite(lat) && Number.isFinite(lng)) {
            return NextResponse.json({
              result: {
                latitude: lat,
                longitude: lng,
                name: first.name || q,
                address: first.formatted_address || '',
              },
            });
          }
        }
      }
    }

    // Fallback: OpenStreetMap search so user still gets a location pin.
    const osmUrl = `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(q)}`;
    const osmRes = await fetch(osmUrl, {
      headers: {
        'User-Agent': 'nyc-web/1.0 (place search fallback)',
      },
    });
    if (!osmRes.ok) {
      return NextResponse.json({ result: null });
    }

    const osmData = await osmRes.json();
    const firstOsm = Array.isArray(osmData) ? osmData[0] : null;
    if (!firstOsm) {
      return NextResponse.json({ result: null });
    }

    const lat = Number(firstOsm.lat);
    const lng = Number(firstOsm.lon);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      return NextResponse.json({ result: null });
    }

    return NextResponse.json({
      result: {
        latitude: lat,
        longitude: lng,
        name: q,
        address: firstOsm.display_name || q,
      },
    });
  } catch (error) {
    console.error('[API] Place search error:', error);
    return NextResponse.json({ result: null });
  }
}
