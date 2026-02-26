'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import type { Precinct, Sector, LatLng, MapType } from '@/types';

interface AppContextType {
  isDark: boolean;
  mapType: MapType;
  boundaryVisible: boolean;
  selectedPrecinct: Precinct | null;
  selectedSector: Sector | null;
  searchedAddress: string | null;
  searchedLocation: LatLng | null;
  tourHint: string | null;
  isDataLoaded: boolean;
  contextReady: boolean;
  setMapType: (type: MapType) => void;
  setBoundaryVisible: (visible: boolean) => void;
  setSelectedPrecinct: (precinct: Precinct | null) => void;
  setSelectedSector: (sector: Sector | null) => void;
  setSearchedAddress: (address: string | null) => void;
  setSearchedLocation: (location: LatLng | null) => void;
  setTourHint: (hint: string | null) => void;
  setIsDataLoaded: (loaded: boolean) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function safeParse<T>(value: string | null): T | null {
  if (!value) return null;
  try {
    return JSON.parse(value) as T;
  } catch {
    return null;
  }
}

function isValidLatLng(value: unknown): value is LatLng {
  if (!value || typeof value !== 'object') return false;
  const loc = value as LatLng;
  return isFiniteNumber(loc.latitude) && isFiniteNumber(loc.longitude);
}

function isValidPrecinct(value: unknown): value is Precinct {
  if (!value || typeof value !== 'object') return false;
  const p = value as Precinct;
  return isFiniteNumber(p.precinctNum) && isFiniteNumber(p.centroidLat) && isFiniteNumber(p.centroidLng);
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [isDark, setIsDark] = useState(false);
  const [mapType, setMapType] = useState<MapType>('standard');
  const [boundaryVisible, setBoundaryVisible] = useState(true);
  const [selectedPrecinct, setSelectedPrecinct] = useState<Precinct | null>(null);
  const [selectedSector, setSelectedSector] = useState<Sector | null>(null);
  const [searchedAddress, setSearchedAddress] = useState<string | null>(null);
  const [searchedLocation, setSearchedLocation] = useState<LatLng | null>(null);
  const [tourHint, setTourHint] = useState<string | null>(null);
  const [isDataLoaded, setIsDataLoaded] = useState(false);
  const [contextReady, setContextReady] = useState(false);

  // Load from sessionStorage on mount
  useEffect(() => {
    const parsedLocation = safeParse<LatLng>(sessionStorage.getItem('searchedLocation'));
    const parsedPrecinct = safeParse<Precinct>(sessionStorage.getItem('selectedPrecinct'));
    const parsedSector = safeParse<Sector>(sessionStorage.getItem('selectedSector'));
    const savedAddress = sessionStorage.getItem('searchedAddress');

    if (parsedLocation && isValidLatLng(parsedLocation)) {
      setSearchedLocation(parsedLocation);
    } else {
      sessionStorage.removeItem('searchedLocation');
    }

    if (savedAddress) setSearchedAddress(savedAddress);

    if (parsedPrecinct && isValidPrecinct(parsedPrecinct)) {
      setSelectedPrecinct(parsedPrecinct);
    } else {
      sessionStorage.removeItem('selectedPrecinct');
    }

    if (parsedSector) {
      setSelectedSector(parsedSector);
    } else {
      sessionStorage.removeItem('selectedSector');
    }

    setContextReady(true);
  }, []);

  // Persist to sessionStorage when values change
  useEffect(() => {
    if (!contextReady) return;
    if (searchedLocation) {
      sessionStorage.setItem('searchedLocation', JSON.stringify(searchedLocation));
    } else {
      sessionStorage.removeItem('searchedLocation');
    }
  }, [searchedLocation, contextReady]);

  useEffect(() => {
    if (!contextReady) return;
    if (searchedAddress) {
      sessionStorage.setItem('searchedAddress', searchedAddress);
    } else {
      sessionStorage.removeItem('searchedAddress');
    }
  }, [searchedAddress, contextReady]);

  useEffect(() => {
    if (!contextReady) return;
    if (selectedPrecinct) {
      sessionStorage.setItem('selectedPrecinct', JSON.stringify(selectedPrecinct));
    } else {
      sessionStorage.removeItem('selectedPrecinct');
    }
  }, [selectedPrecinct, contextReady]);

  useEffect(() => {
    if (!contextReady) return;
    if (selectedSector) {
      sessionStorage.setItem('selectedSector', JSON.stringify(selectedSector));
    } else {
      sessionStorage.removeItem('selectedSector');
    }
  }, [selectedSector, contextReady]);

  return (
    <AppContext.Provider
      value={{
        isDark,
        mapType,
        boundaryVisible,
        selectedPrecinct,
        selectedSector,
        searchedAddress,
        searchedLocation,
        tourHint,
        isDataLoaded,
        contextReady,
        setMapType,
        setBoundaryVisible,
        setSelectedPrecinct,
        setSelectedSector,
        setSearchedAddress,
        setSearchedLocation,
        setTourHint,
        setIsDataLoaded,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useAppContext() {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useAppContext must be used within an AppProvider');
  }
  return context;
}
