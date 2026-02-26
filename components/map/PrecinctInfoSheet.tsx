'use client';

import { useEffect, useState } from 'react';
import { useTheme } from '@/components/ThemeProvider';
import { useAppContext } from '@/lib/context/AppContext';
import { Colors } from '@/lib/theme/colors';
import { isFavorited, upsertFavorite, removeFavorite } from '@/lib/db/database';
import { findSectorAtLocation } from '@/lib/db/sectorRepository';
import {
  X,
  Phone,
  MapPin,
  Star,
  Navigation,
  Copy,
  ExternalLink,
  Shield,
} from 'lucide-react';

export default function PrecinctInfoSheet() {
  const { theme } = useTheme();
  const {
    selectedPrecinct,
    selectedSector,
    searchedLocation,
    searchedAddress,
    setSelectedPrecinct,
    setSelectedSector,
    setSearchedLocation,
    setSearchedAddress,
  } = useAppContext();

  const colors = theme === 'dark' ? Colors.dark : Colors.light;
  const [isFav, setIsFav] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  useEffect(() => {
    if (selectedPrecinct) {
      (async () => {
        const fav = await isFavorited(selectedPrecinct.precinctNum);
        setIsFav(fav);
      })();
    }
  }, [selectedPrecinct]);

  useEffect(() => {
    if (!selectedPrecinct || selectedSector || !searchedLocation) return;
    (async () => {
      const detected = await findSectorAtLocation(searchedLocation);
      if (detected && detected.precinctNum === selectedPrecinct.precinctNum) {
        setSelectedSector(detected);
      }
    })();
  }, [selectedPrecinct, selectedSector, searchedLocation, setSelectedSector]);

  if (!selectedPrecinct) return null;

  const handleClose = () => {
    setSelectedPrecinct(null);
    setSelectedSector(null);
    setSearchedLocation(null);
    setSearchedAddress(null);
  };

  const handleToggleFavorite = async () => {
    if (!selectedPrecinct) return;

    if (isFav) {
      await removeFavorite(selectedPrecinct.precinctNum);
      setIsFav(false);
      showToastMessage('Removed from favorites');
    } else {
      await upsertFavorite(selectedPrecinct.precinctNum, selectedPrecinct.name);
      setIsFav(true);
      showToastMessage('Added to favorites');
    }
  };

  const showToastMessage = (msg: string) => {
    setToastMessage(msg);
    setShowToast(true);
    setTimeout(() => setShowToast(false), 2000);
  };

  const handleCopyAddress = () => {
    navigator.clipboard.writeText(selectedPrecinct.address);
    showToastMessage('Address copied');
  };

  const handleCopyPhone = () => {
    navigator.clipboard.writeText(selectedPrecinct.phone);
    showToastMessage('Phone copied');
  };

  const handleDirections = () => {
    const url = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(
      selectedPrecinct.address
    )}`;
    window.open(url, '_blank');
  };

  return (
    <>
      <div
        className="rounded-t-2xl md:rounded-2xl shadow-2xl overflow-hidden"
        style={{
          backgroundColor: colors.surface,
          borderTop: `4px solid ${colors.accent}`,
        }}
      >
        {/* Header */}
        <div className="flex items-start justify-between p-4 border-b" style={{ borderColor: colors.cardBorder }}>
          <div className="flex items-start gap-3 flex-1">
            <div
              className="p-2 rounded-lg"
              style={{ backgroundColor: colors.accent + '20' }}
            >
              <Shield size={24} style={{ color: colors.accent }} />
            </div>
            <div className="flex-1">
              <h2 className="text-xl font-black" style={{ color: colors.textPrimary }}>
                Precinct {selectedPrecinct.precinctNum}
              </h2>
              <p className="text-sm font-semibold" style={{ color: colors.textSecondary }}>
                {selectedPrecinct.name}
              </p>
              {selectedSector && (
                <p className="text-xs font-semibold mt-1" style={{ color: colors.accent }}>
                  Sector {selectedSector.sectorId}
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleToggleFavorite}
              className="p-2 rounded-lg transition-all hover:scale-110"
              style={{ backgroundColor: colors.card }}
            >
              <Star
                size={20}
                style={{ color: isFav ? colors.warning : colors.textTertiary }}
                fill={isFav ? colors.warning : 'none'}
              />
            </button>
            <button
              onClick={handleClose}
              className="p-2 rounded-lg transition-all hover:scale-110"
              style={{ backgroundColor: colors.card }}
            >
              <X size={20} style={{ color: colors.textTertiary }} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4 max-h-64 overflow-y-auto">
          {/* Sector */}
          <div className="flex items-start gap-3">
            <Shield size={18} style={{ color: colors.accent }} className="mt-1 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-semibold" style={{ color: colors.textSecondary }}>
                Sector
              </p>
              <p className="text-sm font-bold" style={{ color: colors.textPrimary }}>
                {selectedSector?.sectorId || 'Sector unavailable for this point'}
              </p>
            </div>
          </div>

          {/* Address */}
          <div className="flex items-start gap-3">
            <MapPin size={18} style={{ color: colors.accent }} className="mt-1 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-semibold" style={{ color: colors.textSecondary }}>
                Address
              </p>
              <p className="text-sm font-bold" style={{ color: colors.textPrimary }}>
                {selectedPrecinct.address}
              </p>
              {searchedAddress && (
                <p className="text-xs mt-1" style={{ color: colors.textTertiary }}>
                  📍 {searchedAddress}
                </p>
              )}
            </div>
            <button
              onClick={handleCopyAddress}
              className="p-2 rounded-lg transition-all hover:scale-110"
              style={{ backgroundColor: colors.card }}
            >
              <Copy size={16} style={{ color: colors.textTertiary }} />
            </button>
          </div>

          {/* Phone */}
          {selectedPrecinct.phone && (
            <div className="flex items-start gap-3">
              <Phone size={18} style={{ color: colors.accent }} className="mt-1 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-sm font-semibold" style={{ color: colors.textSecondary }}>
                  Phone
                </p>
                <a
                  href={`tel:${selectedPrecinct.phone}`}
                  className="text-sm font-bold hover:underline"
                  style={{ color: colors.textPrimary }}
                >
                  {selectedPrecinct.phone}
                </a>
              </div>
              <button
                onClick={handleCopyPhone}
                className="p-2 rounded-lg transition-all hover:scale-110"
                style={{ backgroundColor: colors.card }}
              >
                <Copy size={16} style={{ color: colors.textTertiary }} />
              </button>
            </div>
          )}

          {/* Borough */}
          {selectedPrecinct.borough && (
            <div className="flex items-start gap-3">
              <MapPin size={18} style={{ color: colors.accent }} className="mt-1 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-sm font-semibold" style={{ color: colors.textSecondary }}>
                  Borough
                </p>
                <p className="text-sm font-bold" style={{ color: colors.textPrimary }}>
                  {selectedPrecinct.borough}
                </p>
              </div>
            </div>
          )}

          {/* Directions Button */}
          <button
            onClick={handleDirections}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-bold transition-all hover:shadow-xl"
            style={{
              backgroundColor: colors.accent,
              color: colors.onAccentContrast,
            }}
          >
            <Navigation size={18} />
            Get Directions
          </button>
        </div>
      </div>

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
    </>
  );
}
