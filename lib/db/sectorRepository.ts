// Sector repository functions (NYC Open Data dataset source)
import type { Sector, LatLng } from '@/types';
import nycOpenDataSectors from '@/data/NYPD_Sectors.json';
import proj4 from 'proj4';

type RawFeature = {
  geometry?: { type?: 'Polygon' | 'MultiPolygon' | string; coordinates?: any };
  properties?: {
    pct?: string | number;
    sector?: string;
    patrol_bor?: string;
    phase?: string;
    sq_miles?: string | number;
    sector_ind?: string;
    START_DATE?: string;
  };
};

let cachedSectors: Sector[] | null = null;

const NAD83_NY_LI_FT =
  '+proj=lcc +lat_1=41.03333333333333 +lat_2=40.66666666666666 +lat_0=40.16666666666666 +lon_0=-74 +x_0=300000 +y_0=0 +datum=NAD83 +units=us-ft +no_defs';
const WGS84 = 'EPSG:4326';
const NYC_BOUNDS = {
  minLat: 40.45,
  maxLat: 40.95,
  minLng: -74.35,
  maxLng: -73.60,
};

function isInNycBounds(lat: number, lng: number): boolean {
  return (
    lat >= NYC_BOUNDS.minLat &&
    lat <= NYC_BOUNDS.maxLat &&
    lng >= NYC_BOUNDS.minLng &&
    lng <= NYC_BOUNDS.maxLng
  );
}

function normalizeCoord(coord: any): LatLng | null {
  const x = Number(coord?.[0]);
  const y = Number(coord?.[1]);
  if (!Number.isFinite(x) || !Number.isFinite(y)) return null;

  // If coordinates are not in lon/lat range, treat as State Plane and convert.
  if (Math.abs(x) > 180 || Math.abs(y) > 90) {
    try {
      const [lon, lat] = proj4(NAD83_NY_LI_FT, WGS84, [x, y]);
      if (Number.isFinite(lat) && Number.isFinite(lon) && isInNycBounds(lat, lon)) {
        return { latitude: lat, longitude: lon };
      }
    } catch {
      // Fall through to raw fallback below.
    }
  }

  // Raw [lon, lat] fallback (many NYC Open Data exports are already WGS84).
  if (isInNycBounds(y, x)) {
    return { latitude: y, longitude: x };
  }
  return null;
}

function getParsedSectors(): Sector[] {
  if (cachedSectors) return cachedSectors;

  const features: RawFeature[] = Array.isArray((nycOpenDataSectors as any)?.features)
    ? (nycOpenDataSectors as any).features
    : [];

  const parsed: Sector[] = [];

  for (const feature of features) {
    const props = feature.properties || {};
    const precinctNum = Number(props.pct);
    const sectorId = String(props.sector || '').trim();
    if (!Number.isFinite(precinctNum) || !sectorId) continue;

    const rings = getOuterRings(feature.geometry?.type, feature.geometry?.coordinates);
    for (const ring of rings) {
      const boundary: LatLng[] = ring
        .map((coord: any) => normalizeCoord(coord))
        .filter((p: LatLng | null): p is LatLng => p !== null);

      if (boundary.length < 3) continue;

      let minLat = Infinity;
      let maxLat = -Infinity;
      let minLng = Infinity;
      let maxLng = -Infinity;
      for (const p of boundary) {
        minLat = Math.min(minLat, p.latitude);
        maxLat = Math.max(maxLat, p.latitude);
        minLng = Math.min(minLng, p.longitude);
        maxLng = Math.max(maxLng, p.longitude);
      }

      parsed.push({
        sectorId,
        precinctNum,
        patrolBor: props.patrol_bor || undefined,
        phase: props.phase || undefined,
        sqMiles: Number.isFinite(Number(props.sq_miles)) ? Number(props.sq_miles) : undefined,
        sectorInd: props.sector_ind || undefined,
        startDate: props.START_DATE || undefined,
        boundary,
        boundingBox: { minLat, maxLat, minLng, maxLng },
      });
    }
  }

  cachedSectors = parsed;
  return parsed;
}

function getOuterRings(type: string | undefined, coordinates: any): any[][] {
  if (type === 'Polygon' && Array.isArray(coordinates) && Array.isArray(coordinates[0])) {
    return [coordinates[0]];
  }
  if (type === 'MultiPolygon' && Array.isArray(coordinates)) {
    return coordinates
      .map((polygon: any) => (Array.isArray(polygon) && Array.isArray(polygon[0]) ? polygon[0] : null))
      .filter((ring: any[] | null): ring is any[] => ring !== null);
  }
  return [];
}

function pointInBoundingBox(point: LatLng, box: Sector['boundingBox']): boolean {
  return (
    point.latitude >= box.minLat &&
    point.latitude <= box.maxLat &&
    point.longitude >= box.minLng &&
    point.longitude <= box.maxLng
  );
}

export async function getSectorsForPrecinct(precinctNum: number): Promise<Sector[]> {
  return getParsedSectors().filter((s) => s.precinctNum === precinctNum);
}

export async function getAllSectors(): Promise<Sector[]> {
  return getParsedSectors();
}

export async function findSectorAtLocation(point: LatLng): Promise<Sector | null> {
  const sectors = getParsedSectors();
  for (const sector of sectors) {
    if (!pointInBoundingBox(point, sector.boundingBox)) continue;
    if (isPointInPolygon(point, sector.boundary)) return sector;
  }
  return null;
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
