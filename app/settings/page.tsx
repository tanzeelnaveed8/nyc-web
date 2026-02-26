'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTheme } from '@/components/ThemeProvider';
import { useAppContext } from '@/lib/context/AppContext';
import { Colors } from '@/lib/theme/colors';
import Navigation from '@/components/Navigation';
import { getAllFavorites, removeFavorite } from '@/lib/db/database';
import { getHome, getWork, setHome, setWork, clearHome, clearWork } from '@/lib/db/homeWorkRepository';
import { getCurrentLocation, reverseGeocode, findNearbyNYPDPrecinct, geocodeAddress } from '@/lib/utils/geo';
import { findNearestPrecinct, getPrecinctByNumber } from '@/lib/db/database';
import { findSectorAtLocation } from '@/lib/db/sectorRepository';
import type { Favorite, SavedPlace } from '@/types';
import {
  Settings as SettingsIcon,
  Moon,
  Sun,
  Map as MapIcon,
  Star,
  Trash2,
  Shield,
  Info,
  Home as HomeIcon,
  Briefcase,
  Plus,
  Loader2,
  HelpCircle,
  PlayCircle,
  Bug,
  Lightbulb,
  X,
} from 'lucide-react';

export default function SettingsPage() {
  const router = useRouter();
  const { theme, toggleTheme } = useTheme();
  const { mapType, setMapType, boundaryVisible, setBoundaryVisible, setTourHint } = useAppContext();
  const colors = theme === 'dark' ? Colors.dark : Colors.light;

  const [favorites, setFavorites] = useState<Favorite[]>([]);
  const [homePlace, setHomePlace] = useState<SavedPlace | null>(null);
  const [workPlace, setWorkPlace] = useState<SavedPlace | null>(null);
  const [savingHome, setSavingHome] = useState(false);
  const [savingWork, setSavingWork] = useState(false);
  const [savingAddress, setSavingAddress] = useState(false);
  const [placeModal, setPlaceModal] = useState<'home' | 'work' | null>(null);
  const [addressInput, setAddressInput] = useState('');
  const [helpOpen, setHelpOpen] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const favs = await getAllFavorites();
    setFavorites(favs);

    const home = await getHome();
    const work = await getWork();
    setHomePlace(home);
    setWorkPlace(work);
  };

  const handleRemoveFavorite = async (precinctNum: number) => {
    if (confirm('Remove this favorite?')) {
      await removeFavorite(precinctNum);
      loadData();
    }
  };

  const handleSaveCurrentLocation = async (type: 'home' | 'work') => {
    try {
      if (type === 'home') setSavingHome(true);
      else setSavingWork(true);

      const position = await getCurrentLocation();
      const point = {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
      };

      // Ask Google which NYPD precinct covers this location (same as mobile app)
      let precinct = null;
      const nearbyNum = await findNearbyNYPDPrecinct(point.latitude, point.longitude);

      if (nearbyNum) {
        precinct = await getPrecinctByNumber(nearbyNum);
      }

      // Fallback to nearest centroid if Google didn't find one
      if (!precinct) {
        precinct = await findNearestPrecinct(point);
      }

      if (!precinct) {
        showToastMessage('Could not find precinct for this location');
        return;
      }

      const sector = await findSectorAtLocation(point);
      const address = await reverseGeocode(point.latitude, point.longitude);

      const place: Omit<SavedPlace, 'type'> = {
        precinctNum: precinct.precinctNum,
        sectorId: sector?.sectorId,
        address: address || 'Unknown address',
        latitude: point.latitude,
        longitude: point.longitude,
      };

      if (type === 'home') {
        await setHome(place);
        setHomePlace({ ...place, type: 'home' });
        showToastMessage('Home location saved');
      } else {
        await setWork(place);
        setWorkPlace({ ...place, type: 'work' });
        showToastMessage('Work location saved');
      }

      loadData();
    } catch (error) {
      console.error('[Settings] Save location error:', error);
      showToastMessage('Failed to save location. Please enable location access.');
    } finally {
      if (type === 'home') setSavingHome(false);
      else setSavingWork(false);
    }
  };

  const handleSaveByAddress = async (type: 'home' | 'work') => {
    const trimmed = addressInput.trim();
    if (!trimmed) return;

    try {
      setSavingAddress(true);
      const geocoded = await geocodeAddress(trimmed);
      if (!geocoded) {
        showToastMessage('Address not found. Try full NYC address (e.g. 123 Broadway, Manhattan).');
        return;
      }

      const point = {
        latitude: geocoded.latitude,
        longitude: geocoded.longitude,
      };

      let precinct = null;
      const nearbyNum = await findNearbyNYPDPrecinct(point.latitude, point.longitude);
      if (nearbyNum) {
        precinct = await getPrecinctByNumber(nearbyNum);
      }
      if (!precinct) {
        precinct = await findNearestPrecinct(point);
      }
      if (!precinct) {
        showToastMessage('That address is outside NYC precinct coverage.');
        return;
      }

      const sector = await findSectorAtLocation(point);
      const place: Omit<SavedPlace, 'type'> = {
        precinctNum: precinct.precinctNum,
        sectorId: sector?.sectorId,
        address: trimmed,
        latitude: point.latitude,
        longitude: point.longitude,
      };

      if (type === 'home') {
        await setHome(place);
        setHomePlace({ ...place, type: 'home' });
        showToastMessage('Home address saved');
      } else {
        await setWork(place);
        setWorkPlace({ ...place, type: 'work' });
        showToastMessage('Work address saved');
      }

      setPlaceModal(null);
      setAddressInput('');
      loadData();
    } catch (error) {
      console.error('[Settings] Save address error:', error);
      showToastMessage('Failed to save address. Please try again.');
    } finally {
      setSavingAddress(false);
    }
  };

  const handleClearLocation = async (type: 'home' | 'work') => {
    if (confirm(`Clear ${type} location?`)) {
      if (type === 'home') {
        await clearHome();
        setHomePlace(null);
        showToastMessage('Home location cleared');
      } else {
        await clearWork();
        setWorkPlace(null);
        showToastMessage('Work location cleared');
      }
      loadData();
    }
  };

  const showToastMessage = (msg: string) => {
    setToastMessage(msg);
    setShowToast(true);
    setTimeout(() => setShowToast(false), 2000);
  };

  const startTutorial = (hint: 'map' | 'sectors' | 'calendar', path: '/map' | '/search' | '/calendar') => {
    setTourHint(hint);
    setHelpOpen(false);
    router.push(path);
  };

  const openFeedbackEmail = (type: 'bug' | 'feature') => {
    const subject =
      type === 'bug' ? 'NYC Precinct Web - Bug Report' : 'NYC Precinct Web - Feature Suggestion';
    const body =
      type === 'bug'
        ? 'Please describe the bug and steps to reproduce.\n\n---\nApp: NYC Precinct Web\nVersion: 1.0.0'
        : 'Please describe your feature idea.\n\n---\nApp: NYC Precinct Web\nVersion: 1.0.0';
    window.location.href = `mailto:feedback@nycprecinct.app?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  };

  return (
    <div className="flex flex-col min-h-screen" style={{ backgroundColor: colors.background }}>
      <Navigation />

      <main className="flex-1 mt-16 md:mb-0 mb-20 p-4 md:p-6 max-w-4xl mx-auto w-full">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-black mb-2" style={{ color: colors.textPrimary }}>
            Settings
          </h1>
          <p className="text-sm" style={{ color: colors.textSecondary }}>
            Customize your NYC Precinct experience
          </p>
        </div>

        {/* Appearance */}
        <div className="mb-6">
          <h2 className="text-lg font-black mb-3" style={{ color: colors.textPrimary }}>
            Appearance
          </h2>
          <div
            className="p-4 rounded-xl"
            style={{
              backgroundColor: colors.surface,
              border: `1px solid ${colors.cardBorder}`,
            }}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {theme === 'dark' ? (
                  <Moon size={20} style={{ color: colors.accent }} />
                ) : (
                  <Sun size={20} style={{ color: colors.accent }} />
                )}
                <div>
                  <p className="text-sm font-bold" style={{ color: colors.textPrimary }}>
                    Dark Mode
                  </p>
                  <p className="text-xs" style={{ color: colors.textSecondary }}>
                    {theme === 'dark' ? 'Enabled' : 'Disabled'}
                  </p>
                </div>
              </div>
              <button
                onClick={toggleTheme}
                className="px-4 py-2 rounded-lg font-semibold text-sm transition-all hover:scale-105"
                style={{
                  backgroundColor: colors.accent,
                  color: colors.onAccentContrast,
                }}
              >
                Toggle
              </button>
            </div>
          </div>
        </div>

        {/* Map Settings */}
        <div className="mb-6">
          <h2 className="text-lg font-black mb-3" style={{ color: colors.textPrimary }}>
            Map Settings
          </h2>
          <div className="space-y-3">
            <div
              className="p-4 rounded-xl"
              style={{
                backgroundColor: colors.surface,
                border: `1px solid ${colors.cardBorder}`,
              }}
            >
              <div className="flex items-center gap-3 mb-3">
                <MapIcon size={20} style={{ color: colors.accent }} />
                <p className="text-sm font-bold" style={{ color: colors.textPrimary }}>
                  Map Type
                </p>
              </div>
              <div className="flex gap-2">
                {(['standard', 'satellite', 'terrain'] as const).map((type) => (
                  <button
                    key={type}
                    onClick={() => setMapType(type)}
                    className="flex-1 px-3 py-2 rounded-lg text-xs font-bold transition-all hover:scale-105"
                    style={{
                      backgroundColor: mapType === type ? colors.accent : colors.card,
                      color: mapType === type ? colors.onAccentContrast : colors.textSecondary,
                    }}
                  >
                    {type.charAt(0).toUpperCase() + type.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            <div
              className="p-4 rounded-xl"
              style={{
                backgroundColor: colors.surface,
                border: `1px solid ${colors.cardBorder}`,
              }}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Shield size={20} style={{ color: colors.accent }} />
                  <div>
                    <p className="text-sm font-bold" style={{ color: colors.textPrimary }}>
                      Precinct Boundaries
                    </p>
                    <p className="text-xs" style={{ color: colors.textSecondary }}>
                      {boundaryVisible ? 'Visible' : 'Hidden'}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setBoundaryVisible(!boundaryVisible)}
                  className="px-4 py-2 rounded-lg font-semibold text-sm transition-all hover:scale-105"
                  style={{
                    backgroundColor: boundaryVisible ? colors.accent : colors.card,
                    color: boundaryVisible ? colors.onAccentContrast : colors.textSecondary,
                  }}
                >
                  {boundaryVisible ? 'Hide' : 'Show'}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Saved Locations */}
        <div className="mb-6">
          <h2 className="text-lg font-black mb-3" style={{ color: colors.textPrimary }}>
            Saved Locations
          </h2>
          <div className="space-y-3">
            {/* Home */}
            <div
              className="p-4 rounded-xl"
              style={{
                backgroundColor: colors.surface,
                border: `1px solid ${colors.cardBorder}`,
              }}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3 flex-1">
                  <HomeIcon size={20} style={{ color: colors.accent }} className="mt-1" />
                  <div className="flex-1">
                    <p className="text-sm font-bold mb-1" style={{ color: colors.textPrimary }}>
                      Home
                    </p>
                    {homePlace ? (
                      <>
                        <p className="text-xs mb-1" style={{ color: colors.textSecondary }}>
                          {homePlace.address}
                        </p>
                        <p className="text-xs" style={{ color: colors.textTertiary }}>
                          Precinct {homePlace.precinctNum}
                          {homePlace.sectorId && ` • Sector ${homePlace.sectorId}`}
                        </p>
                      </>
                    ) : (
                      <p className="text-xs" style={{ color: colors.textTertiary }}>
                        Not set
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex gap-2">
                  {homePlace ? (
                        <>
                          <button
                            onClick={() => setPlaceModal('home')}
                            className="px-3 py-2 rounded-lg font-semibold text-xs transition-all hover:scale-105"
                            style={{ backgroundColor: colors.card, color: colors.textSecondary }}
                          >
                            Change
                          </button>
                          <button
                            onClick={() => handleClearLocation('home')}
                            className="p-2 rounded-lg transition-all hover:scale-110"
                            style={{ backgroundColor: colors.card }}
                          >
                            <Trash2 size={16} style={{ color: colors.error }} />
                          </button>
                        </>
                  ) : (
                        <button
                          onClick={() => setPlaceModal('home')}
                          disabled={savingHome}
                          className="flex items-center gap-2 px-3 py-2 rounded-lg font-semibold text-xs transition-all hover:scale-105 disabled:opacity-50"
                          style={{
                            backgroundColor: colors.accent,
                            color: colors.onAccentContrast,
                          }}
                        >
                          {savingHome ? (
                            <Loader2 className="animate-spin" size={14} />
                          ) : (
                            <Plus size={14} />
                          )}
                          {savingHome ? 'Saving...' : 'Set'}
                        </button>
                  )}
                </div>
              </div>
            </div>

            {/* Work */}
            <div
              className="p-4 rounded-xl"
              style={{
                backgroundColor: colors.surface,
                border: `1px solid ${colors.cardBorder}`,
              }}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3 flex-1">
                  <Briefcase size={20} style={{ color: colors.secondary }} className="mt-1" />
                  <div className="flex-1">
                    <p className="text-sm font-bold mb-1" style={{ color: colors.textPrimary }}>
                      Work
                    </p>
                    {workPlace ? (
                      <>
                        <p className="text-xs mb-1" style={{ color: colors.textSecondary }}>
                          {workPlace.address}
                        </p>
                        <p className="text-xs" style={{ color: colors.textTertiary }}>
                          Precinct {workPlace.precinctNum}
                          {workPlace.sectorId && ` • Sector ${workPlace.sectorId}`}
                        </p>
                      </>
                    ) : (
                      <p className="text-xs" style={{ color: colors.textTertiary }}>
                        Not set
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex gap-2">
                  {workPlace ? (
                    <>
                      <button
                        onClick={() => setPlaceModal('work')}
                        className="px-3 py-2 rounded-lg font-semibold text-xs transition-all hover:scale-105"
                        style={{ backgroundColor: colors.card, color: colors.textSecondary }}
                      >
                        Change
                      </button>
                      <button
                        onClick={() => handleClearLocation('work')}
                        className="p-2 rounded-lg transition-all hover:scale-110"
                        style={{ backgroundColor: colors.card }}
                      >
                        <Trash2 size={16} style={{ color: colors.error }} />
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={() => setPlaceModal('work')}
                      disabled={savingWork}
                      className="flex items-center gap-2 px-3 py-2 rounded-lg font-semibold text-xs transition-all hover:scale-105 disabled:opacity-50"
                      style={{
                        backgroundColor: colors.secondary,
                        color: colors.onAccentContrast,
                      }}
                    >
                      {savingWork ? (
                        <Loader2 className="animate-spin" size={14} />
                      ) : (
                        <Plus size={14} />
                      )}
                      {savingWork ? 'Saving...' : 'Set'}
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Help */}
        <div className="mb-6">
          <h2 className="text-lg font-black mb-3" style={{ color: colors.textPrimary }}>
            Help
          </h2>
          <div
            className="p-4 rounded-xl"
            style={{
              backgroundColor: colors.surface,
              border: `1px solid ${colors.cardBorder}`,
            }}
          >
            <button
              onClick={() => setHelpOpen(true)}
              className="w-full flex items-center justify-between gap-3"
            >
              <div className="flex items-center gap-3">
                <HelpCircle size={20} style={{ color: colors.accent }} />
                <div className="text-left">
                  <p className="text-sm font-bold" style={{ color: colors.textPrimary }}>
                    Quick Help
                  </p>
                  <p className="text-xs" style={{ color: colors.textSecondary }}>
                    Map, sectors, and calendar tutorial
                  </p>
                </div>
              </div>
              <PlayCircle size={18} style={{ color: colors.textTertiary }} />
            </button>
          </div>
        </div>

        {/* Feedback */}
        <div className="mb-6">
          <h2 className="text-lg font-black mb-3" style={{ color: colors.textPrimary }}>
            Feedback
          </h2>
          <div className="space-y-2">
            <button
              onClick={() => openFeedbackEmail('bug')}
              className="w-full flex items-center gap-3 p-4 rounded-xl text-left transition-all hover:scale-[1.01]"
              style={{ backgroundColor: colors.surface, border: `1px solid ${colors.cardBorder}` }}
            >
              <Bug size={18} style={{ color: colors.accent }} />
              <span className="text-sm font-semibold" style={{ color: colors.textPrimary }}>
                Report a Bug
              </span>
            </button>
            <button
              onClick={() => openFeedbackEmail('feature')}
              className="w-full flex items-center gap-3 p-4 rounded-xl text-left transition-all hover:scale-[1.01]"
              style={{ backgroundColor: colors.surface, border: `1px solid ${colors.cardBorder}` }}
            >
              <Lightbulb size={18} style={{ color: colors.accent }} />
              <span className="text-sm font-semibold" style={{ color: colors.textPrimary }}>
                Suggest a Feature
              </span>
            </button>
          </div>
        </div>

        {/* Favorites */}
        <div className="mb-6">
          <h2 className="text-lg font-black mb-3" style={{ color: colors.textPrimary }}>
            Favorites
          </h2>
          {favorites.length > 0 ? (
            <div className="space-y-2">
              {favorites.map((fav) => (
                <div
                  key={fav.favoriteId}
                  className="flex items-center justify-between p-4 rounded-xl"
                  style={{
                    backgroundColor: colors.surface,
                    border: `1px solid ${colors.cardBorder}`,
                  }}
                >
                  <div className="flex items-center gap-3">
                    <Star size={18} style={{ color: colors.warning }} fill={colors.warning} />
                    <div>
                      <p className="text-sm font-bold" style={{ color: colors.textPrimary }}>
                        {fav.label}
                      </p>
                      <p className="text-xs" style={{ color: colors.textSecondary }}>
                        Precinct {fav.precinctNum}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleRemoveFavorite(fav.precinctNum)}
                    className="p-2 rounded-lg transition-all hover:scale-110"
                    style={{ backgroundColor: colors.card }}
                  >
                    <Trash2 size={16} style={{ color: colors.error }} />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div
              className="p-6 rounded-xl text-center"
              style={{
                backgroundColor: colors.surface,
                border: `1px solid ${colors.cardBorder}`,
              }}
            >
              <Star size={32} style={{ color: colors.textTertiary }} className="mx-auto mb-2" />
              <p className="text-sm font-semibold" style={{ color: colors.textSecondary }}>
                No favorites yet
              </p>
              <p className="text-xs mt-1" style={{ color: colors.textTertiary }}>
                Add precincts to favorites from the map
              </p>
            </div>
          )}
        </div>

        {/* About */}
        <div>
          <h2 className="text-lg font-black mb-3" style={{ color: colors.textPrimary }}>
            About
          </h2>
          <div
            className="p-4 rounded-xl"
            style={{
              backgroundColor: colors.surface,
              border: `1px solid ${colors.cardBorder}`,
            }}
          >
            <div className="flex items-start gap-3">
              <Info size={20} style={{ color: colors.accent }} className="mt-0.5" />
              <div>
                <p className="text-sm font-bold mb-1" style={{ color: colors.textPrimary }}>
                  NYC Precinct Web App
                </p>
                <p className="text-xs mb-2" style={{ color: colors.textSecondary }}>
                  Version 1.0.0
                </p>
                <p className="text-xs" style={{ color: colors.textTertiary }}>
                  Find your NYPD precinct, explore sectors, search addresses, and access NYC law information.
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Toast */}
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

      {/* Home/Work Save Modal */}
      {placeModal && (
        <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/40 p-4">
          <div
            className="w-full max-w-xl rounded-2xl p-5"
            style={{ backgroundColor: colors.surface, border: `1px solid ${colors.cardBorder}` }}
          >
            <div className="flex items-start justify-between mb-3">
              <div>
                <h3 className="text-xl font-black" style={{ color: colors.textPrimary }}>
                  Save {placeModal === 'home' ? 'Home' : 'Work'}
                </h3>
                <p className="text-sm mt-1" style={{ color: colors.textSecondary }}>
                  Use current location or enter an NYC address.
                </p>
              </div>
              <button
                onClick={() => {
                  setPlaceModal(null);
                  setAddressInput('');
                }}
                className="p-2 rounded-lg"
                style={{ backgroundColor: colors.card }}
              >
                <X size={16} style={{ color: colors.textTertiary }} />
              </button>
            </div>

            <button
              onClick={() => handleSaveCurrentLocation(placeModal)}
              disabled={savingHome || savingWork || savingAddress}
              className="w-full mb-4 px-4 py-3 rounded-xl font-bold disabled:opacity-60"
              style={{ backgroundColor: colors.accent, color: colors.onAccentContrast }}
            >
              {savingHome || savingWork ? 'Saving current location...' : 'Use current location'}
            </button>

            <div className="mb-3">
              <label className="text-xs font-bold uppercase tracking-wider" style={{ color: colors.textTertiary }}>
                Enter Address
              </label>
              <input
                type="text"
                value={addressInput}
                onChange={(e) => setAddressInput(e.target.value)}
                placeholder="e.g. 123 Broadway, Manhattan"
                className="w-full mt-2 px-3 py-3 rounded-xl outline-none"
                style={{
                  backgroundColor: colors.card,
                  color: colors.textPrimary,
                  border: `1px solid ${colors.outline}`,
                }}
              />
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => {
                  setPlaceModal(null);
                  setAddressInput('');
                }}
                className="flex-1 px-4 py-2.5 rounded-xl font-semibold"
                style={{ backgroundColor: colors.card, color: colors.textSecondary }}
              >
                Cancel
              </button>
              <button
                onClick={() => handleSaveByAddress(placeModal)}
                disabled={!addressInput.trim() || savingAddress || savingHome || savingWork}
                className="flex-1 px-4 py-2.5 rounded-xl font-semibold disabled:opacity-60"
                style={{ backgroundColor: colors.secondary, color: colors.onAccentContrast }}
              >
                {savingAddress ? 'Saving...' : 'Save Address'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Quick Help Modal */}
      {helpOpen && (
        <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/40 p-4">
          <div
            className="w-full max-w-2xl rounded-2xl p-5 md:p-6 max-h-[90vh] overflow-y-auto"
            style={{ backgroundColor: colors.surface, border: `1px solid ${colors.cardBorder}` }}
          >
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-2xl font-black" style={{ color: colors.textPrimary }}>
                  Quick Help
                </h3>
                <p className="text-sm mt-1" style={{ color: colors.textSecondary }}>
                  Step-by-step guide for map, sectors, and calendar
                </p>
              </div>
              <button onClick={() => setHelpOpen(false)} className="p-2 rounded-lg" style={{ backgroundColor: colors.card }}>
                <X size={16} style={{ color: colors.textTertiary }} />
              </button>
            </div>

            <div className="space-y-3">
              <div className="p-4 rounded-xl" style={{ backgroundColor: colors.card, border: `1px solid ${colors.cardBorder}` }}>
                <p className="text-sm font-black mb-2" style={{ color: colors.textPrimary }}>1. Using the Map</p>
                <ul className="text-sm space-y-1" style={{ color: colors.textSecondary }}>
                  <li>• Tap map to see precinct and sector</li>
                  <li>• Use the Where Am I button for your current location</li>
                  <li>• Use Home/Work shortcuts for one-tap access</li>
                </ul>
                <button
                  onClick={() => startTutorial('map', '/map')}
                  className="mt-3 px-4 py-2 rounded-lg text-sm font-bold"
                  style={{ backgroundColor: colors.accent, color: colors.onAccentContrast }}
                >
                  Start Map Tutorial
                </button>
              </div>

              <div className="p-4 rounded-xl" style={{ backgroundColor: colors.card, border: `1px solid ${colors.cardBorder}` }}>
                <p className="text-sm font-black mb-2" style={{ color: colors.textPrimary }}>2. Finding Sectors</p>
                <ul className="text-sm space-y-1" style={{ color: colors.textSecondary }}>
                  <li>• Search any NYC address</li>
                  <li>• Map auto-detects precinct + sector</li>
                  <li>• Save Home/Work for faster sector lookup</li>
                </ul>
                <button
                  onClick={() => startTutorial('sectors', '/search')}
                  className="mt-3 px-4 py-2 rounded-lg text-sm font-bold"
                  style={{ backgroundColor: colors.accent, color: colors.onAccentContrast }}
                >
                  Start Sectors Tutorial
                </button>
              </div>

              <div className="p-4 rounded-xl" style={{ backgroundColor: colors.card, border: `1px solid ${colors.cardBorder}` }}>
                <p className="text-sm font-black mb-2" style={{ color: colors.textPrimary }}>3. RDO Calendar</p>
                <ul className="text-sm space-y-1" style={{ color: colors.textSecondary }}>
                  <li>• Select precinct to view monthly hours</li>
                  <li>• Green = Open, Red = Closed / RDO</li>
                  <li>• Tap any day for full details</li>
                </ul>
                <button
                  onClick={() => startTutorial('calendar', '/calendar')}
                  className="mt-3 px-4 py-2 rounded-lg text-sm font-bold"
                  style={{ backgroundColor: colors.accent, color: colors.onAccentContrast }}
                >
                  Start Calendar Tutorial
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
