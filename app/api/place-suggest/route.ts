import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const q = request.nextUrl.searchParams.get('q')?.trim();
    if (!q || q.length < 2) {
      return NextResponse.json({ suggestions: [] });
    }

    const key =
      process.env.GOOGLE_MAPS_API_KEY ||
      process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ||
      '';
    if (!key) {
      return NextResponse.json({ suggestions: [] });
    }

    const params = new URLSearchParams({
      input: q,
      location: '40.7128,-74.0060',
      radius: '50000',
      components: 'country:us',
      key,
    });

    const response = await fetch(
      `https://maps.googleapis.com/maps/api/place/autocomplete/json?${params.toString()}`
    );
    if (!response.ok) {
      return NextResponse.json({ suggestions: [] });
    }

    const data = await response.json();
    if (data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
      return NextResponse.json({ suggestions: [] });
    }

    const suggestions = (data.predictions || []).slice(0, 6).map((p: any) => ({
      description: p.description as string,
      mainText: p.structured_formatting?.main_text as string | undefined,
      secondaryText: p.structured_formatting?.secondary_text as string | undefined,
    }));

    return NextResponse.json({ suggestions });
  } catch (error) {
    console.error('[API] Place suggest error:', error);
    return NextResponse.json({ suggestions: [] });
  }
}
