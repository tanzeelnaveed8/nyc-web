'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { Loader } from '@googlemaps/js-api-loader';
import { useTheme } from '@/components/ThemeProvider';
import { useAppContext } from '@/lib/context/AppContext';
import { Colors } from '@/lib/theme/colors';
import {
  getAllPrecincts,
  findPrecinctAtLocation,
  findNearestPrecinct,
  getPrecinctByNumber,
} from '@/lib/db/database';
import { findSectorAtLocation } from '@/lib/db/sectorRepository';
import { getHome, getWork } from '@/lib/db/homeWorkRepository';
import { getCurrentLocation, reverseGeocode, findNearbyNYPDPrecinct } from '@/lib/utils/geo';
import type { Precinct, LatLng, SavedPlace } from '@/types';
import { MapPin, Crosshair, Loader2, Home, Briefcase } from 'lucide-react';
import PRECINCT_BOUNDARIES from '@/data/precinctBoundaries.json';

const NYC_CENTER = { lat: 40.7128, lng: -74.006 };

function isFiniteCoordinate(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

export default function MapComponent() {
  const { theme } = useTheme();
  const {
    selectedPrecinct,
    selectedSector,
    setSelectedPrecinct,
    setSelectedSector,
    searchedLocation,
    searchedAddress,
    setSearchedLocation,
    setSearchedAddress,
    boundaryVisible,
    mapType,
    contextReady,
  } = useAppContext();

  const colors = theme === 'dark' ? Colors.dark : Colors.light;
  const mapRef = useRef<HTMLDivElement>(null);
  const googleMapRef = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<google.maps.Marker[]>([]);
  const polygonsRef = useRef<google.maps.Polygon[]>([]);
  const activeMarkerRef = useRef<google.maps.Marker | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [mapReady, setMapReady] = useState(false);
  const [locationLoading, setLocationLoading] = useState(false);
  const [precincts, setPrecincts] = useState<Precinct[]>([]);
  const [homePlace, setHomePlace] = useState<SavedPlace | null>(null);
  const [workPlace, setWorkPlace] = useState<SavedPlace | null>(null);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  const isValidPoint = useCallback((point: LatLng | null | undefined): point is LatLng => {
    return !!point && isFiniteCoordinate(point.latitude) && isFiniteCoordinate(point.longitude);
  }, []);

  const isValidPrecinctCenter = useCallback((precinct: Precinct | null | undefined) => {
    return !!precinct && isFiniteCoordinate(precinct.centroidLat) && isFiniteCoordinate(precinct.centroidLng);
  }, []);

  const getPrecinctFocusPoint = useCallback((precinct: Precinct | null | undefined) => {
    if (!precinct) return null;
    if (isFiniteCoordinate(precinct.stationLat) && isFiniteCoordinate(precinct.stationLng)) {
      return { lat: precinct.stationLat, lng: precinct.stationLng };
    }
    if (isFiniteCoordinate(precinct.centroidLat) && isFiniteCoordinate(precinct.centroidLng)) {
      return { lat: precinct.centroidLat, lng: precinct.centroidLng };
    }
    return null;
  }, []);

  const resolvePrecinctAndSector = useCallback(async (point: LatLng) => {
    const sector = await findSectorAtLocation(point);
    let precinct = null;

    // Prefer boundary-based resolution first so tapped location stays accurate.
    if (!precinct) {
      precinct = await findPrecinctAtLocation(point);
    }
    if (!precinct && sector) {
      precinct = await getPrecinctByNumber(sector.precinctNum);
    }
    if (!precinct) {
      const nearbyNum = await findNearbyNYPDPrecinct(point.latitude, point.longitude);
      if (nearbyNum) {
        precinct = await getPrecinctByNumber(nearbyNum);
      }
    }
    if (!precinct) {
      precinct = await findNearestPrecinct(point);
    }

    return { precinct, sector };
  }, []);

  // Initialize Google Maps
  useEffect(() => {
    if (!contextReady) return;

    const initMap = async () => {
      try {
        const loader = new Loader({
          apiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '',
          version: 'weekly',
        });

        await loader.load();

        if (!mapRef.current) return;

        // Always initialize at NYC_CENTER (like mobile app)
        const map = new google.maps.Map(mapRef.current, {
          center: NYC_CENTER,
          zoom: 11,
          mapTypeId: mapType === 'satellite' ? 'satellite' : mapType === 'terrain' ? 'terrain' : 'roadmap',
          styles: theme === 'dark' ? darkMapStyles : [],
          disableDefaultUI: false,
          zoomControl: true,
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: true,
        });

        googleMapRef.current = map;
        setMapReady(true);

        // Load precincts
        const allPrecincts = await getAllPrecincts();
        setPrecincts(allPrecincts);

        // Load home/work
        const [home, work] = await Promise.all([getHome(), getWork()]);
        setHomePlace(home);
        setWorkPlace(work);

        // Add click listener
        map.addListener('click', async (e: google.maps.MapMouseEvent) => {
          if (!e.latLng) return;
          const lat = e.latLng.lat();
          const lng = e.latLng.lng();
          await handleMapClick({ latitude: lat, longitude: lng });
        });

        setIsLoading(false);
      } catch (error) {
        console.error('[Map] Init error:', error);
        setMapReady(false);
        setIsLoading(false);
      }
    };

    initMap();
  }, [contextReady]);

  // Update map type
  useEffect(() => {
    if (!googleMapRef.current || !mapReady) return;
    const mapTypeId = mapType === 'satellite' ? 'satellite' : mapType === 'terrain' ? 'terrain' : 'roadmap';
    googleMapRef.current.setMapTypeId(mapTypeId);
  }, [mapType, mapReady]);

  // Pan to searched location when it changes (exactly like mobile app)
  useEffect(() => {
    if (!googleMapRef.current || !mapReady || !isValidPoint(searchedLocation)) return;
    const targetLocation = searchedLocation;

    const timer = setTimeout(() => {
      if (googleMapRef.current) {
        googleMapRef.current.panTo({
          lat: targetLocation.latitude,
          lng: targetLocation.longitude
        });
        googleMapRef.current.setZoom(17);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchedLocation, mapReady, isValidPoint]);

  // Pan to selected precinct when it changes (only if no searched location)
  useEffect(() => {
    if (!googleMapRef.current || !mapReady || isValidPoint(searchedLocation)) return;
    const focusPoint = getPrecinctFocusPoint(selectedPrecinct);
    if (!focusPoint) return;

    googleMapRef.current.panTo(focusPoint);
    googleMapRef.current.setZoom(13);
  }, [selectedPrecinct, searchedLocation, mapReady, isValidPoint, getPrecinctFocusPoint]);

  // Draw precinct boundaries
  useEffect(() => {
    if (!googleMapRef.current || !mapReady || !boundaryVisible) {
      // Clear polygons
      polygonsRef.current.forEach(p => p.setMap(null));
      polygonsRef.current = [];
      return;
    }

    // Clear existing polygons
    polygonsRef.current.forEach(p => p.setMap(null));
    polygonsRef.current = [];

    // Draw boundaries
    Object.entries(PRECINCT_BOUNDARIES).forEach(([num, coords]) => {
      const precinctNum = parseInt(num);
      const isSelected = selectedPrecinct?.precinctNum === precinctNum;

      const polygon = new google.maps.Polygon({
        paths: (coords as any[]).map(c => ({ lat: c.latitude, lng: c.longitude })),
        strokeColor: isSelected ? colors.mapSelectedStroke : colors.mapOverlayStroke,
        strokeOpacity: 1,
        strokeWeight: isSelected ? 2.5 : 1,
        fillColor: isSelected ? colors.mapSelectedFill : colors.mapOverlayFill,
        fillOpacity: 0.3,
        clickable: true,
        map: googleMapRef.current!,
      });

      polygon.addListener('click', async (e: google.maps.PolyMouseEvent) => {
        const precinct = await getPrecinctByNumber(precinctNum);
        if (!precinct) return;

        const lat = e.latLng?.lat();
        const lng = e.latLng?.lng();
        if (!isFiniteCoordinate(lat) || !isFiniteCoordinate(lng)) {
          const focusPoint = getPrecinctFocusPoint(precinct);
          if (focusPoint) {
            setSelectedPrecinct(precinct);
            setSelectedSector(null);
            setSearchedLocation(null);
            setSearchedAddress(null);
            googleMapRef.current?.panTo(focusPoint);
          }
          return;
        }

        const point: LatLng = { latitude: lat, longitude: lng };
        const sector = await findSectorAtLocation(point);
        const focusPoint = getPrecinctFocusPoint(precinct);

        setSelectedPrecinct(precinct);
        setSelectedSector(
          sector && sector.precinctNum === precinct.precinctNum ? sector : null
        );

        // Keep marker anchored to precinct focus (station/centroid), not arbitrary tap point.
        setSearchedLocation(null);
        setSearchedAddress(null);

        if (focusPoint) {
          googleMapRef.current?.panTo(focusPoint);
        }
      });

      polygonsRef.current.push(polygon);
    });
  }, [
    boundaryVisible,
    selectedPrecinct,
    colors,
    setSelectedPrecinct,
    setSelectedSector,
    setSearchedLocation,
    setSearchedAddress,
    mapReady,
    getPrecinctFocusPoint,
  ]);

  // Show a single active marker (red) to avoid duplicate markers
  useEffect(() => {
    if (!googleMapRef.current || !mapReady) return;

    // Clear previous marker
    if (activeMarkerRef.current) {
      activeMarkerRef.current.setMap(null);
      activeMarkerRef.current = null;
    }

    let markerPosition: { lat: number; lng: number } | null = null;
    let markerTitle = 'Selected Location';

    if (isValidPoint(searchedLocation)) {
      markerPosition = { lat: searchedLocation.latitude, lng: searchedLocation.longitude };
      markerTitle = searchedAddress || 'Searched Location';
    } else {
      const focusPoint = getPrecinctFocusPoint(selectedPrecinct);
      if (focusPoint) {
        markerPosition = focusPoint;
        markerTitle = selectedPrecinct ? `Precinct ${selectedPrecinct.precinctNum}` : 'Selected Location';
      }
    }

    if (markerPosition) {
      const marker = new google.maps.Marker({
        position: markerPosition,
        map: googleMapRef.current,
        title: markerTitle,
        icon: {
          url: 'https://maps.google.com/mapfiles/ms/icons/red-dot.png',
        },
        zIndex: 1000,
      });
      activeMarkerRef.current = marker;
    }
  }, [selectedPrecinct, searchedLocation, searchedAddress, colors, mapReady, isValidPoint, getPrecinctFocusPoint]);

  // Handle map click
  const handleMapClick = useCallback(async (point: LatLng) => {
    try {
      if (!isValidPoint(point)) return;
      const { precinct, sector } = await resolvePrecinctAndSector(point);

      setSelectedPrecinct(precinct);
      setSelectedSector(sector);
      setSearchedLocation(point);

      const address = await reverseGeocode(point.latitude, point.longitude);
      setSearchedAddress(address || 'Unknown location');
    } catch (error) {
      console.error('[Map] Click error:', error);
    }
  }, [setSelectedPrecinct, setSelectedSector, setSearchedLocation, setSearchedAddress, resolvePrecinctAndSector, isValidPoint]);

  // Detect user location
  const detectUserLocation = useCallback(async () => {
    try {
      setLocationLoading(true);
      const position = await getCurrentLocation();
      const point: LatLng = {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
      };
      if (!isValidPoint(point)) {
        showToastMessage('Invalid location received. Please try again.');
        return;
      }

      // Strict for "Where Am I?":
      // show precinct details only if user is actually inside a precinct boundary.
      let precinct = null;
      const nearbyNum = await findNearbyNYPDPrecinct(point.latitude, point.longitude);
      if (nearbyNum) {
        precinct = await getPrecinctByNumber(nearbyNum);
      }
      if (!precinct) {
        precinct = await findPrecinctAtLocation(point);
      }
      const sector = precinct ? await findSectorAtLocation(point) : null;

      // Always show current location on map, even if precinct lookup fails.
      setSearchedLocation(point);
      const address = await reverseGeocode(point.latitude, point.longitude);
      setSearchedAddress(address || 'Your location');
      googleMapRef.current?.panTo({ lat: point.latitude, lng: point.longitude });
      googleMapRef.current?.setZoom(16);

      if (precinct) {
        setSelectedPrecinct(precinct);
        setSelectedSector(sector);
      } else {
        setSelectedPrecinct(null);
        setSelectedSector(null);
        showToastMessage('Location found, but NYC precinct could not be identified.');
      }
    } catch (error) {
      console.error('[Map] Location error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unable to get your location. Please enable location access.';
      showToastMessage(errorMessage);
    } finally {
      setLocationLoading(false);
    }
  }, [setSelectedPrecinct, setSelectedSector, setSearchedLocation, setSearchedAddress, isValidPoint]);

  const showToastMessage = (msg: string) => {
    setToastMessage(msg);
    setShowToast(true);
    setTimeout(() => setShowToast(false), 4000);
  };

  return (
    <div className="relative w-full h-full">
      <div ref={mapRef} className="w-full h-full" />

      {isLoading && (
        <div
          className="absolute inset-0 flex items-center justify-center"
          style={{ backgroundColor: colors.background }}
        >
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="animate-spin" size={48} style={{ color: colors.accent }} />
            <p style={{ color: colors.textSecondary }} className="text-sm font-semibold">
              Loading map...
            </p>
          </div>
        </div>
      )}

      {/* Home & Work Shortcuts */}
      {(homePlace || workPlace) && (
        <div className="absolute top-20 right-4 flex flex-col gap-2 z-10">
          {homePlace && (
            <button
              onClick={async () => {
                const precinct = await getPrecinctByNumber(homePlace.precinctNum);
                if (precinct) {
                  const point = { latitude: homePlace.latitude, longitude: homePlace.longitude };
                  if (!isValidPoint(point)) return;
                  const sector = await findSectorAtLocation(point);
                  setSelectedPrecinct(precinct);
                  setSelectedSector(sector);
                  setSearchedLocation(point);
                  setSearchedAddress(homePlace.address);
                  googleMapRef.current?.panTo({ lat: homePlace.latitude, lng: homePlace.longitude });
                  googleMapRef.current?.setZoom(14);
                }
              }}
              className="flex items-center gap-2 px-4 py-2 rounded-lg shadow-lg transition-all hover:shadow-xl"
              style={{
                backgroundColor: colors.accent,
                color: colors.onAccentContrast,
              }}
            >
              <Home size={18} />
              <span className="font-bold text-sm">Home</span>
            </button>
          )}
          {workPlace && (
            <button
              onClick={async () => {
                const precinct = await getPrecinctByNumber(workPlace.precinctNum);
                if (precinct) {
                  const point = { latitude: workPlace.latitude, longitude: workPlace.longitude };
                  if (!isValidPoint(point)) return;
                  const sector = await findSectorAtLocation(point);
                  setSelectedPrecinct(precinct);
                  setSelectedSector(sector);
                  setSearchedLocation(point);
                  setSearchedAddress(workPlace.address);
                  googleMapRef.current?.panTo({ lat: workPlace.latitude, lng: workPlace.longitude });
                  googleMapRef.current?.setZoom(14);
                }
              }}
              className="flex items-center gap-2 px-4 py-2 rounded-lg shadow-lg transition-all hover:shadow-xl"
              style={{
                backgroundColor: colors.surface,
                color: colors.textPrimary,
                border: `1px solid ${colors.outline}`,
              }}
            >
              <Briefcase size={18} />
              <span className="font-bold text-sm">Work</span>
            </button>
          )}
        </div>
      )}

      {/* Where Am I Button */}
      <button
        onClick={detectUserLocation}
        disabled={locationLoading}
        className="absolute bottom-24 md:bottom-6 left-1/2 -translate-x-1/2 md:left-6 md:translate-x-0 flex items-center gap-3 px-6 py-3 rounded-xl shadow-lg transition-all hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
        style={{
          backgroundColor: colors.accent,
          color: colors.onAccentContrast,
        }}
      >
        {locationLoading ? (
          <Loader2 className="animate-spin" size={20} />
        ) : (
          <Crosshair size={20} />
        )}
        <span className="font-bold text-sm">
          {locationLoading ? 'Finding...' : 'Where Am I?'}
        </span>
      </button>

      {/* Toast Notification */}
      {showToast && (
        <div
          className="fixed bottom-32 md:bottom-8 left-1/2 transform -translate-x-1/2 px-4 py-3 rounded-lg shadow-lg z-50 max-w-md"
          style={{
            backgroundColor: colors.card,
            color: colors.textPrimary,
            border: `1px solid ${colors.cardBorder}`,
          }}
        >
          <p className="text-sm font-semibold text-center">{toastMessage}</p>
        </div>
      )}
    </div>
  );
}

// Dark mode map styles
const darkMapStyles: google.maps.MapTypeStyle[] = [
  { elementType: 'geometry', stylers: [{ color: '#1A2332' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#0A1929' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#B0BEC5' }] },
  {
    featureType: 'administrative.locality',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#ECEFF1' }],
  },
  {
    featureType: 'poi',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#78909C' }],
  },
  {
    featureType: 'poi.park',
    elementType: 'geometry',
    stylers: [{ color: '#1E3A2F' }],
  },
  {
    featureType: 'poi.park',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#4CAF50' }],
  },
  {
    featureType: 'road',
    elementType: 'geometry',
    stylers: [{ color: '#263238' }],
  },
  {
    featureType: 'road',
    elementType: 'geometry.stroke',
    stylers: [{ color: '#1A2332' }],
  },
  {
    featureType: 'road',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#90A4AE' }],
  },
  {
    featureType: 'road.highway',
    elementType: 'geometry',
    stylers: [{ color: '#37474F' }],
  },
  {
    featureType: 'road.highway',
    elementType: 'geometry.stroke',
    stylers: [{ color: '#263238' }],
  },
  {
    featureType: 'road.highway',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#B0BEC5' }],
  },
  {
    featureType: 'transit',
    elementType: 'geometry',
    stylers: [{ color: '#263238' }],
  },
  {
    featureType: 'transit.station',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#78909C' }],
  },
  {
    featureType: 'water',
    elementType: 'geometry',
    stylers: [{ color: '#0D1F2D' }],
  },
  {
    featureType: 'water',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#546E7A' }],
  },
  {
    featureType: 'water',
    elementType: 'labels.text.stroke',
    stylers: [{ color: '#0A1929' }],
  },
];
