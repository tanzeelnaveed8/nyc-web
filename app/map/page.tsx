'use client';

import { useEffect, useState, useRef } from 'react';
import { useTheme } from '@/components/ThemeProvider';
import { useAppContext } from '@/lib/context/AppContext';
import { Colors } from '@/lib/theme/colors';
import Navigation from '@/components/Navigation';
import MapComponent from '@/components/map/MapComponent';
import PrecinctInfoSheet from '@/components/map/PrecinctInfoSheet';
import { initializeDatabase } from '@/lib/db/database';
import { Loader2 } from 'lucide-react';

function MapPageContent() {
  const { theme } = useTheme();
  const { selectedPrecinct, isDataLoaded, setIsDataLoaded, tourHint, setTourHint } = useAppContext();
  const [loading, setLoading] = useState(true);
  const colors = theme === 'dark' ? Colors.dark : Colors.light;
  const hasInitialized = useRef(false);

  useEffect(() => {
    if (hasInitialized.current) return;
    hasInitialized.current = true;

    (async () => {
      try {
        await initializeDatabase();
        setIsDataLoaded(true);
      } catch (error) {
        console.error('[MapPage] Init error:', error);
      } finally {
        setLoading(false);
      }
    })();
  }, [setIsDataLoaded]);

  if (loading) {
    return (
      <div
        className="flex min-h-screen items-center justify-center"
        style={{ backgroundColor: colors.background }}
      >
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="animate-spin" size={48} style={{ color: colors.accent }} />
          <p style={{ color: colors.textSecondary }} className="text-sm font-semibold">
            Loading NYC Precinct data...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen" style={{ backgroundColor: colors.background }}>
      <Navigation />

      <main className="flex-1 relative mt-16 md:mb-0 mb-20">
        {tourHint === 'map' && (
          <div className="absolute top-3 left-3 right-3 z-20 md:max-w-2xl">
            <div
              className="rounded-xl p-3 shadow-lg"
              style={{ backgroundColor: colors.surface, border: `1px solid ${colors.cardBorder}` }}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-black" style={{ color: colors.textPrimary }}>Map Tutorial</p>
                  <p className="text-xs mt-1" style={{ color: colors.textSecondary }}>
                    Tap map to see precinct/sector, long-press for address, and use the Where Am I button for GPS lookup.
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
          </div>
        )}

        <MapComponent />

        {selectedPrecinct && (
          <div className="absolute bottom-0 left-0 right-0 md:bottom-4 md:left-4 md:right-auto md:w-96 z-10">
            <PrecinctInfoSheet />
          </div>
        )}
      </main>
    </div>
  );
}

export default function MapPage() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="flex min-h-screen items-center justify-center" style={{ backgroundColor: '#F5F3E9' }}>
        <Loader2 className="animate-spin" size={48} style={{ color: '#B79C7E' }} />
      </div>
    );
  }

  return <MapPageContent />;
}
