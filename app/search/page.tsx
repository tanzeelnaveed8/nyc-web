'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useTheme } from '@/components/ThemeProvider';
import { useAppContext } from '@/lib/context/AppContext';
import { Colors } from '@/lib/theme/colors';
import Navigation from '@/components/Navigation';
import {
  getAllPrecincts,
  findPrecinctAtLocation,
  findNearestPrecinct,
  getPrecinctByNumber,
} from '@/lib/db/database';
import { findSectorAtLocation, getSectorsForPrecinct } from '@/lib/db/sectorRepository';
import { getRecentSearches, addRecentSearch, clearRecentSearches } from '@/lib/db/searchRepository';
import { getHome, getWork } from '@/lib/db/homeWorkRepository';
import { geocodeAddress, searchPlaceInNYC, findNearbyNYPDPrecinct } from '@/lib/utils/geo';
import type { Precinct, RecentSearch, SavedPlace } from '@/types';
import {
  Search as SearchIcon,
  MapPin,
  Clock,
  Home as HomeIcon,
  Briefcase,
  Shield,
  Loader2,
  Navigation as NavigationIcon,
  Building2,
  Landmark,
  TreePine,
  Plane,
  Ship,
} from 'lucide-react';

const BOROUGH_ICONS: Record<string, any> = {
  Manhattan: Building2,
  Brooklyn: Landmark,
  Bronx: TreePine,
  Queens: Plane,
  'Staten Island': Ship,
};

const QUICK_BOROUGHS = ['Manhattan', 'Brooklyn', 'Bronx', 'Queens', 'Staten Island'];
const QUICK_POPULAR = ['Midtown', '1st Precinct', '60th Precinct', '40th Precinct'];

interface PlaceSuggestion {
  description: string;
  mainText?: string;
  secondaryText?: string;
}

export default function SearchPage() {
  const { theme } = useTheme();
  const router = useRouter();
  const {
    setSelectedPrecinct,
    setSelectedSector,
    setSearchedAddress,
    setSearchedLocation,
    tourHint,
    setTourHint,
  } = useAppContext();

  const colors = theme === 'dark' ? Colors.dark : Colors.light;

  const [query, setQuery] = useState('');
  const [allPrecincts, setAllPrecincts] = useState<Precinct[]>([]);
  const [results, setResults] = useState<Precinct[]>([]);
  const [recentSearches, setRecentSearches] = useState<RecentSearch[]>([]);
  const [geocoding, setGeocoding] = useState(false);
  const [homePlace, setHomePlace] = useState<SavedPlace | null>(null);
  const [workPlace, setWorkPlace] = useState<SavedPlace | null>(null);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [placeSuggestions, setPlaceSuggestions] = useState<PlaceSuggestion[]>([]);
  const [suggestionsLoading, setSuggestionsLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [activeSuggestion, setActiveSuggestion] = useState(-1);
  const suggestionsHideTimerRef = useRef<number | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const [data, recent, h, w] = await Promise.all([
      getAllPrecincts(),
      getRecentSearches(),
      getHome(),
      getWork(),
    ]);
    setAllPrecincts(data);
    setRecentSearches(recent);
    setHomePlace(h);
    setWorkPlace(w);
  };

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }
    const q = query.toLowerCase();
    setResults(
      allPrecincts.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.address.toLowerCase().includes(q) ||
          p.borough.toLowerCase().includes(q) ||
          p.precinctNum.toString().includes(q) ||
          p.phone.includes(q)
      )
    );
  }, [query, allPrecincts]);

  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) {
      setPlaceSuggestions([]);
      setSuggestionsLoading(false);
      return;
    }

    const timer = window.setTimeout(async () => {
      try {
        setSuggestionsLoading(true);
        const response = await fetch(`/api/place-suggest?q=${encodeURIComponent(q)}`);
        if (!response.ok) {
          setPlaceSuggestions([]);
          return;
        }
        const data = await response.json();
        setPlaceSuggestions(Array.isArray(data?.suggestions) ? data.suggestions : []);
      } catch {
        setPlaceSuggestions([]);
      } finally {
        setSuggestionsLoading(false);
      }
    }, 220);

    return () => {
      window.clearTimeout(timer);
    };
  }, [query]);

  const handleSelect = async (precinct: Precinct) => {
    const point = {
      latitude: precinct.stationLat ?? precinct.centroidLat,
      longitude: precinct.stationLng ?? precinct.centroidLng,
    };
    await addRecentSearch({
      queryText: precinct.name,
      displayAddress: `${precinct.name} — ${precinct.address}`,
      latitude: point.latitude,
      longitude: point.longitude,
      timestamp: Date.now(),
    });
    setSelectedPrecinct(precinct);
    const sector = await findSectorAtLocation(point);
    setSelectedSector(sector);
    setSearchedAddress(precinct.address);
    setSearchedLocation(point);
    loadData();
    router.push('/map');
  };

  const handleAddressSearch = async (forcedQuery?: string) => {
    const effectiveQuery = forcedQuery ?? query;
    if (!effectiveQuery.trim() || geocoding) return;
    setGeocoding(true);

    try {
      const searchQuery = effectiveQuery.trim();
      let point: { latitude: number; longitude: number };
      let displayName: string;

      // 1) Try Places search first (building, hall, event, landmark – like Google Maps)
      const placeResult = await searchPlaceInNYC(searchQuery);
      if (placeResult) {
        point = { latitude: placeResult.latitude, longitude: placeResult.longitude };
        displayName = placeResult.address || placeResult.name || searchQuery;
      } else {
        // 2) Fallback: address geocoding
        const geocoded = await geocodeAddress(searchQuery);
        if (!geocoded) {
          showToastMessage('Could not find that place. Try a NYC address or place name (e.g. "Madison Square Garden", "123 Broadway").');
          setGeocoding(false);
          return;
        }
        point = geocoded;
        displayName = searchQuery;
      }

      const { latitude, longitude } = point;

      // Nearest precinct (always show in details: name, address, distance, min)
      let precinct = null;
      const nearbyNum = await findNearbyNYPDPrecinct(latitude, longitude);
      if (nearbyNum) precinct = await getPrecinctByNumber(nearbyNum);
      if (!precinct) precinct = await findPrecinctAtLocation(point);
      if (!precinct) precinct = await findNearestPrecinct(point);
      const sector = precinct ? await findSectorAtLocation(point) : null;

      await addRecentSearch({
        queryText: searchQuery,
        displayAddress: displayName,
        latitude: point.latitude,
        longitude: point.longitude,
        timestamp: Date.now(),
      });
      const recent = await getRecentSearches();
      setRecentSearches(recent);

      setSelectedPrecinct(precinct);
      setSelectedSector(sector);
      setSearchedAddress(displayName);
      setSearchedLocation(point);
      setShowSuggestions(false);
      setGeocoding(false);
      router.push('/map');
    } catch (err) {
      showToastMessage('Failed to search. Please check your internet connection and try again.');
      setGeocoding(false);
    }
  };

  const handleRecentPress = async (search: RecentSearch) => {
    const match = allPrecincts.find(
      (p) => p.centroidLat === search.latitude && p.centroidLng === search.longitude
    );

    if (match) {
      handleSelect(match);
    } else {
      const point = { latitude: search.latitude, longitude: search.longitude };
      let precinct = null;
      const nearbyNum = await findNearbyNYPDPrecinct(search.latitude, search.longitude);
      if (nearbyNum) {
        precinct = await getPrecinctByNumber(nearbyNum);
      }
      if (!precinct) {
        precinct = await findPrecinctAtLocation(point);
      }
      if (!precinct) {
        precinct = await findNearestPrecinct(point);
      }
      const sector = await findSectorAtLocation(point);
      if (precinct) {
        setSelectedPrecinct(precinct);
        setSelectedSector(sector);
        setSearchedAddress(search.displayAddress);
        setSearchedLocation({ latitude: search.latitude, longitude: search.longitude });
        router.push('/map');
      } else {
        showToastMessage('Could not find a precinct for this recent search.');
      }
    }
  };

  const handleClearHistory = async () => {
    if (confirm('Clear all recent searches?')) {
      await clearRecentSearches();
      loadData();
    }
  };

  const handleSavedPlacePress = async (place: SavedPlace) => {
    try {
      const precinct = await getPrecinctByNumber(place.precinctNum);
      if (!precinct) return;

      let sector = null;
      if (place.sectorId) {
        const sectors = await getSectorsForPrecinct(place.precinctNum);
        sector = sectors.find(s => s.sectorId === place.sectorId) ?? null;
      }

      setSelectedPrecinct(precinct);
      setSelectedSector(sector);
      setSearchedAddress(place.address);
      setSearchedLocation({ latitude: place.latitude, longitude: place.longitude });
      router.push('/map');
    } catch (_) {}
  };

  const showToastMessage = (msg: string) => {
    setToastMessage(msg);
    setShowToast(true);
    setTimeout(() => setShowToast(false), 3000);
  };

  const applyQuickSearch = (term: string) => {
    setQuery(term);
    setShowSuggestions(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSuggestionSelect = async (suggestion: PlaceSuggestion) => {
    if (suggestionsHideTimerRef.current) {
      window.clearTimeout(suggestionsHideTimerRef.current);
    }
    setQuery(suggestion.description);
    setShowSuggestions(false);
    setActiveSuggestion(-1);
    await handleAddressSearch(suggestion.description);
  };

  return (
    <div className="flex flex-col min-h-screen" style={{ backgroundColor: colors.background }}>
      <Navigation />

      <main className="flex-1 mt-16 md:mb-0 mb-20 p-4 md:p-6 max-w-4xl mx-auto w-full">
        {tourHint === 'sectors' && (
          <div
            className="mb-4 p-3 rounded-xl"
            style={{ backgroundColor: colors.surface, border: `1px solid ${colors.cardBorder}` }}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-black" style={{ color: colors.textPrimary }}>Sectors Tutorial</p>
                <p className="text-xs mt-1" style={{ color: colors.textSecondary }}>
                  Search an NYC address, then open map to view exact precinct and sector assignment.
                </p>
              </div>
              <button
                onClick={() => setTourHint(null)}
                className="text-xs font-bold px-2 py-1 rounded-md"
                style={{ backgroundColor: colors.card, color: colors.textSecondary }}
              >
                Close
              </button>
            </div>
          </div>
        )}

        <div className="mb-6">
          <h1 className="text-3xl font-black mb-2" style={{ color: colors.textPrimary }}>
            Search
          </h1>
          <p className="text-sm" style={{ color: colors.textSecondary }}>
            Search like Google Maps – any place, then see nearest precinct and distance
          </p>
        </div>

        <div className="mb-6">
          <div
            className="flex items-center gap-3 p-4 rounded-xl"
            style={{
              backgroundColor: colors.surface,
              border: `2px solid ${colors.outline}`,
            }}
          >
            <SearchIcon size={20} style={{ color: colors.textTertiary }} />
            <input
              type="text"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setShowSuggestions(true);
                setActiveSuggestion(-1);
              }}
              onFocus={() => {
                if (query.trim().length >= 2) setShowSuggestions(true);
              }}
              onBlur={() => {
                suggestionsHideTimerRef.current = window.setTimeout(() => {
                  setShowSuggestions(false);
                  setActiveSuggestion(-1);
                }, 120);
              }}
              onKeyDown={(e) => {
                if (e.key === 'ArrowDown' && placeSuggestions.length > 0) {
                  e.preventDefault();
                  setActiveSuggestion((prev) => (prev + 1) % placeSuggestions.length);
                  return;
                }
                if (e.key === 'ArrowUp' && placeSuggestions.length > 0) {
                  e.preventDefault();
                  setActiveSuggestion((prev) => (prev <= 0 ? placeSuggestions.length - 1 : prev - 1));
                  return;
                }
                if (e.key === 'Enter') {
                  if (activeSuggestion >= 0 && placeSuggestions[activeSuggestion]) {
                    e.preventDefault();
                    handleSuggestionSelect(placeSuggestions[activeSuggestion]);
                    return;
                  }
                  if (results.length > 0) handleSelect(results[0]);
                  else if (query.trim()) handleAddressSearch();
                }
              }}
              placeholder="Search any place – building, hall, event, address..."
              className="flex-1 bg-transparent outline-none text-sm font-semibold"
              style={{ color: colors.textPrimary }}
            />
            {geocoding && <Loader2 className="animate-spin" size={20} style={{ color: colors.accent }} />}
          </div>

          {showSuggestions && query.trim().length >= 2 && (
            <div
              className="mt-2 rounded-xl overflow-hidden"
              style={{
                backgroundColor: colors.surface,
                border: `1px solid ${colors.cardBorder}`,
              }}
            >
              {placeSuggestions.map((s, idx) => (
                <button
                  key={`${s.description}-${idx}`}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => handleSuggestionSelect(s)}
                  className="w-full text-left px-4 py-3 transition-colors border-b last:border-b-0"
                  style={{
                    borderColor: colors.cardBorder,
                    backgroundColor: idx === activeSuggestion ? colors.card : 'transparent',
                  }}
                >
                  <p className="text-sm font-semibold" style={{ color: colors.textPrimary }}>
                    {s.mainText || s.description}
                  </p>
                  {s.secondaryText && (
                    <p className="text-xs mt-0.5" style={{ color: colors.textTertiary }}>
                      {s.secondaryText}
                    </p>
                  )}
                </button>
              ))}

              {!placeSuggestions.length && suggestionsLoading && (
                <div className="px-4 py-3 flex items-center gap-2">
                  <Loader2 className="animate-spin" size={14} style={{ color: colors.textTertiary }} />
                  <p className="text-xs" style={{ color: colors.textTertiary }}>Loading suggestions...</p>
                </div>
              )}
            </div>
          )}

          {query.trim() && !results.length && (
            <button
              onClick={() => handleAddressSearch()}
              disabled={geocoding}
              className="w-full mt-3 flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-bold transition-all hover:scale-105 disabled:opacity-50"
              style={{
                backgroundColor: colors.accent,
                color: colors.onAccentContrast,
              }}
            >
              {geocoding ? (
                <>
                  <Loader2 className="animate-spin" size={18} />
                  Searching...
                </>
              ) : (
                <>
                  <MapPin size={18} />
                  Search: &quot;{query}&quot;
                </>
              )}
            </button>
          )}
        </div>

        {!query && (
          <div className="mb-6 space-y-4">
            <div>
              <h2 className="text-xs font-black mb-2 tracking-wider" style={{ color: colors.textSecondary }}>
                QUICK SEARCH
              </h2>
              <div className="flex flex-wrap gap-2">
                {QUICK_BOROUGHS.map((borough) => {
                  const BoroughIcon = BOROUGH_ICONS[borough] || Shield;
                  return (
                    <button
                      key={borough}
                      onClick={() => applyQuickSearch(borough)}
                      className="px-3 py-2 rounded-lg text-sm font-semibold transition-all hover:scale-105"
                      style={{
                        backgroundColor: colors.surface,
                        border: `1px solid ${colors.cardBorder}`,
                        color: colors.textPrimary,
                      }}
                    >
                      <BoroughIcon size={16} className="mr-2 inline" />
                      {borough}
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <h2 className="text-xs font-black mb-2 tracking-wider" style={{ color: colors.textSecondary }}>
                POPULAR
              </h2>
              <div className="flex flex-wrap gap-2">
                {QUICK_POPULAR.map((term) => (
                  <button
                    key={term}
                    onClick={() => applyQuickSearch(term)}
                    className="px-3 py-2 rounded-lg text-sm font-semibold transition-all hover:scale-105"
                    style={{
                      backgroundColor: colors.card,
                      border: `1px solid ${colors.cardBorder}`,
                      color: colors.textSecondary,
                    }}
                  >
                    {term}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {(homePlace || workPlace) && !query && (
          <div className="mb-6">
            <h2 className="text-sm font-black mb-3" style={{ color: colors.textSecondary }}>
              SAVED PLACES
            </h2>
            <div className="space-y-2">
              {homePlace && (
                <button
                  onClick={() => handleSavedPlacePress(homePlace)}
                  className="w-full flex items-start gap-3 p-4 rounded-xl transition-all hover:scale-[1.02]"
                  style={{
                    backgroundColor: colors.surface,
                    border: `1px solid ${colors.cardBorder}`,
                  }}
                >
                  <HomeIcon size={20} style={{ color: colors.accent }} className="mt-0.5" />
                  <div className="flex-1 text-left">
                    <p className="text-sm font-bold" style={{ color: colors.textPrimary }}>
                      Home
                    </p>
                    <p className="text-xs mt-1" style={{ color: colors.textSecondary }}>
                      {homePlace.address}
                    </p>
                    <p className="text-xs mt-1" style={{ color: colors.textTertiary }}>
                      Precinct {homePlace.precinctNum}
                    </p>
                  </div>
                  <NavigationIcon size={16} style={{ color: colors.textTertiary }} />
                </button>
              )}
              {workPlace && (
                <button
                  onClick={() => handleSavedPlacePress(workPlace)}
                  className="w-full flex items-start gap-3 p-4 rounded-xl transition-all hover:scale-[1.02]"
                  style={{
                    backgroundColor: colors.surface,
                    border: `1px solid ${colors.cardBorder}`,
                  }}
                >
                  <Briefcase size={20} style={{ color: colors.secondary }} className="mt-0.5" />
                  <div className="flex-1 text-left">
                    <p className="text-sm font-bold" style={{ color: colors.textPrimary }}>
                      Work
                    </p>
                    <p className="text-xs mt-1" style={{ color: colors.textSecondary }}>
                      {workPlace.address}
                    </p>
                    <p className="text-xs mt-1" style={{ color: colors.textTertiary }}>
                      Precinct {workPlace.precinctNum}
                    </p>
                  </div>
                  <NavigationIcon size={16} style={{ color: colors.textTertiary }} />
                </button>
              )}
            </div>
          </div>
        )}

        {results.length > 0 && (
          <div className="mb-6">
            <h2 className="text-sm font-black mb-3" style={{ color: colors.textSecondary }}>
              RESULTS ({results.length})
            </h2>
            <div className="space-y-2">
              {results.map((precinct) => {
                const BoroughIcon = BOROUGH_ICONS[precinct.borough] || Shield;
                return (
                  <button
                    key={precinct.precinctNum}
                    onClick={() => handleSelect(precinct)}
                    className="w-full flex items-start gap-3 p-4 rounded-xl transition-all hover:scale-[1.02]"
                    style={{
                      backgroundColor: colors.surface,
                      border: `1px solid ${colors.cardBorder}`,
                    }}
                  >
                    <div
                      className="w-10 h-10 rounded-lg flex items-center justify-center"
                      style={{ backgroundColor: colors.card }}
                    >
                      <BoroughIcon size={18} style={{ color: colors.textSecondary }} />
                    </div>
                    <div className="flex-1 text-left">
                      <p className="text-sm font-bold" style={{ color: colors.textPrimary }}>
                        Precinct {precinct.precinctNum} — {precinct.name}
                      </p>
                      <p className="text-xs mt-1" style={{ color: colors.textSecondary }}>
                        {precinct.address}
                      </p>
                      <p className="text-xs mt-1" style={{ color: colors.textTertiary }}>
                        {precinct.borough}
                      </p>
                    </div>
                    <Shield size={16} style={{ color: colors.accent }} />
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {!query && recentSearches.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-black" style={{ color: colors.textSecondary }}>
                RECENT SEARCHES
              </h2>
              <button
                onClick={handleClearHistory}
                className="text-xs font-semibold px-3 py-1 rounded-lg transition-all hover:scale-105"
                style={{
                  backgroundColor: colors.surface,
                  color: colors.error,
                }}
              >
                Clear All
              </button>
            </div>
            <div className="space-y-2">
              {recentSearches.map((search) => (
                <button
                  key={search.searchId}
                  onClick={() => handleRecentPress(search)}
                  className="w-full flex items-start gap-3 p-4 rounded-xl transition-all hover:scale-[1.02]"
                  style={{
                    backgroundColor: colors.surface,
                    border: `1px solid ${colors.cardBorder}`,
                  }}
                >
                  <Clock size={18} style={{ color: colors.textTertiary }} className="mt-0.5" />
                  <div className="flex-1 text-left">
                    <p className="text-sm font-bold" style={{ color: colors.textPrimary }}>
                      {search.queryText}
                    </p>
                    <p className="text-xs mt-1" style={{ color: colors.textSecondary }}>
                      {search.displayAddress}
                    </p>
                  </div>
                  <NavigationIcon size={16} style={{ color: colors.textTertiary }} />
                </button>
              ))}
            </div>
          </div>
        )}

        {!query && recentSearches.length === 0 && !homePlace && !workPlace && (
          <div
            className="p-8 rounded-xl text-center"
            style={{
              backgroundColor: colors.surface,
              border: `1px solid ${colors.cardBorder}`,
            }}
          >
            <SearchIcon size={48} style={{ color: colors.textTertiary }} className="mx-auto mb-4" />
            <p className="text-sm font-semibold mb-2" style={{ color: colors.textSecondary }}>
              No recent searches
            </p>
            <p className="text-xs" style={{ color: colors.textTertiary }}>
              Search for an address or precinct to get started
            </p>
          </div>
        )}
      </main>

      {showToast && (
        <div
          className="fixed bottom-32 md:bottom-8 left-1/2 transform -translate-x-1/2 px-4 py-2 rounded-lg shadow-lg z-50"
          style={{
            backgroundColor: colors.card,
            color: colors.textPrimary,
          }}
        >
          <p className="text-sm font-semibold">{toastMessage}</p>
        </div>
      )}
    </div>
  );
}
