'use client';

import { useEffect, useState, useCallback } from 'react';
import { useTheme } from '@/components/ThemeProvider';
import { useAppContext } from '@/lib/context/AppContext';
import { Colors } from '@/lib/theme/colors';
import Navigation from '@/components/Navigation';
import { Loader2, Info, MapPin } from 'lucide-react';

export default function SectorsPage() {
  const { theme } = useTheme();
  const { selectedPrecinct, selectedSector } = useAppContext();
  const colors = theme === 'dark' ? Colors.dark : Colors.light;

  return (
    <div className="flex flex-col min-h-screen" style={{ backgroundColor: colors.background }}>
      <Navigation />

      <main className="flex-1 mt-16 md:mb-0 mb-20 p-4 md:p-6 max-w-4xl mx-auto w-full">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-black mb-2" style={{ color: colors.textPrimary }}>
            Precinct Sectors
          </h1>
          <p className="text-sm" style={{ color: colors.textSecondary }}>
            Explore sectors within each NYPD precinct
          </p>
        </div>

        {/* Current Selection */}
        {selectedPrecinct && (
          <div
            className="p-4 rounded-xl mb-6"
            style={{
              backgroundColor: colors.surface,
              border: `1px solid ${colors.cardBorder}`,
            }}
          >
            <div className="flex items-start gap-3">
              <MapPin size={20} style={{ color: colors.accent }} className="mt-1" />
              <div>
                <p className="text-sm font-bold mb-1" style={{ color: colors.textPrimary }}>
                  Currently Selected
                </p>
                <p className="text-xs" style={{ color: colors.textSecondary }}>
                  Precinct {selectedPrecinct.precinctNum}
                  {selectedSector && ` - Sector ${selectedSector.sectorId}`}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Info Cards */}
        <div className="space-y-4">
          <div
            className="p-4 rounded-xl"
            style={{
              backgroundColor: colors.surface,
              border: `1px solid ${colors.cardBorder}`,
            }}
          >
            <div className="flex items-start gap-3">
              <Info size={24} style={{ color: colors.accent }} className="flex-shrink-0 mt-1" />
              <div>
                <h3 className="text-base font-black mb-1" style={{ color: colors.textPrimary }}>
                  What are Sectors?
                </h3>
                <p className="text-sm" style={{ color: colors.textSecondary }}>
                  Each precinct is divided into smaller patrol areas called sectors. Officers are assigned to specific sectors for more efficient coverage and faster response times.
                </p>
              </div>
            </div>
          </div>

          <div
            className="p-4 rounded-xl"
            style={{
              backgroundColor: colors.surface,
              border: `1px solid ${colors.cardBorder}`,
            }}
          >
            <div className="flex items-start gap-3">
              <MapPin size={24} style={{ color: colors.secondary }} className="flex-shrink-0 mt-1" />
              <div>
                <h3 className="text-base font-black mb-1" style={{ color: colors.textPrimary }}>
                  Find Your Sector
                </h3>
                <p className="text-sm mb-2" style={{ color: colors.textSecondary }}>
                  Use the Map tab to see which sector your location falls under:
                </p>
                <ul className="text-xs space-y-1" style={{ color: colors.textSecondary }}>
                  <li>• Tap anywhere on the map to see precinct and sector</li>
                  <li>• Use the Where Am I button to find your current sector</li>
                  <li>• Long-press for detailed address information</li>
                </ul>
              </div>
            </div>
          </div>

          <div
            className="p-4 rounded-xl"
            style={{
              backgroundColor: colors.accent + '10',
              border: `1px solid ${colors.accent}`,
            }}
          >
            <div className="flex items-start gap-3">
              <Info size={24} style={{ color: colors.accent }} className="flex-shrink-0 mt-1" />
              <div>
                <h3 className="text-base font-black mb-1" style={{ color: colors.textPrimary }}>
                  How Sectors Work
                </h3>
                <p className="text-sm" style={{ color: colors.textSecondary }}>
                  Sectors are identified by letters (A, B, C, etc.) or alphanumeric codes. Each sector has dedicated patrol units that respond to calls within their assigned area. This system ensures better coverage and accountability.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* CTA */}
        <div
          className="mt-6 p-6 rounded-xl text-center"
          style={{
            backgroundColor: colors.surface,
            border: `1px solid ${colors.cardBorder}`,
          }}
        >
          <MapPin size={48} style={{ color: colors.accent }} className="mx-auto mb-4" />
          <h3 className="text-lg font-black mb-2" style={{ color: colors.textPrimary }}>
            View Sectors on Map
          </h3>
          <p className="text-sm mb-4" style={{ color: colors.textSecondary }}>
            Go to the Map tab to see sector boundaries and find your sector
          </p>
          <a
            href="/map"
            className="inline-block px-6 py-3 rounded-xl font-bold transition-all hover:scale-105"
            style={{
              backgroundColor: colors.accent,
              color: colors.onAccentContrast,
            }}
          >
            Open Map
          </a>
        </div>
      </main>
    </div>
  );
}
