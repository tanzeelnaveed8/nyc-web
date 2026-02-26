export interface LatLng {
  latitude: number;
  longitude: number;
}

export interface Precinct {
  precinctNum: number;
  name: string;
  address: string;
  phone: string;
  borough: string;
  stationLat?: number;
  stationLng?: number;
  boundary: LatLng[];
  centroidLat: number;
  centroidLng: number;
  boundingBox: {
    minLat: number;
    maxLat: number;
    minLng: number;
    maxLng: number;
  };
  openingHours?: Array<{
    day: string;
    hours: string;
    isOpen: boolean;
  }>;
}

export interface Sector {
  sectorId: string;
  precinctNum: number;
  patrolBor?: string;
  phase?: string;
  sqMiles?: number;
  sectorInd?: string;
  startDate?: string;
  boundary: LatLng[];
  boundingBox: {
    minLat: number;
    maxLat: number;
    minLng: number;
    maxLng: number;
  };
}

export interface LawCategory {
  categoryId: string;
  name: string;
  displayOrder: number;
  entryCount: number;
}

export interface LawEntry {
  entryId: number;
  categoryId: string;
  sectionNumber: string;
  title: string;
  bodyText: string;
}

export interface RecentSearch {
  searchId?: number;
  queryText: string;
  displayAddress: string;
  latitude: number;
  longitude: number;
  timestamp: number;
}

export interface Favorite {
  favoriteId?: number;
  precinctNum: number;
  label: string;
  createdAt: number;
}

export interface SavedPlace {
  type: 'home' | 'work';
  precinctNum: number;
  sectorId?: string;
  address: string;
  latitude: number;
  longitude: number;
}

export interface Squad {
  squadId: number;
  squadName: string;
  displayOrder: number;
}

export interface RdoSchedule {
  scheduleId: number;
  squadId: number;
  patternType: 'rotating' | 'steady';
  cycleLength: number;
  patternArray: string[];
  anchorDate: string;
  squadOffset: number;
}

export interface UserPreference {
  key: string;
  value: string;
  updatedAt: number;
}

export type MapType = 'standard' | 'satellite' | 'terrain';
