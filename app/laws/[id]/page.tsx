'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useTheme } from '@/components/ThemeProvider';
import { Colors } from '@/lib/theme/colors';
import Navigation from '@/components/Navigation';
import { getEntryById } from '@/lib/db/lawRepository';
import type { LawEntry } from '@/types';
import { ChevronLeft, Copy, Loader2 } from 'lucide-react';

export default function LawDetailPage() {
  const { theme } = useTheme();
  const router = useRouter();
  const params = useParams();
  const entryId = parseInt(params.id as string);
  const colors = theme === 'dark' ? Colors.dark : Colors.light;

  const [entry, setEntry] = useState<LawEntry | null>(null);
  const [loading, setLoading] = useState(true);
  const [showToast, setShowToast] = useState(false);

  useEffect(() => {
    loadEntry();
  }, [entryId]);

  const loadEntry = async () => {
    try {
      const lawEntry = await getEntryById(entryId);
      setEntry(lawEntry || null);
    } catch (error) {
      console.error('[LawDetail] Load error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    if (!entry) return;
    const text = `${entry.sectionNumber} - ${entry.title}\n\n${entry.bodyText}`;
    navigator.clipboard.writeText(text);
    setShowToast(true);
    setTimeout(() => setShowToast(false), 2000);
  };

  if (loading) {
    return (
      <div className="flex flex-col min-h-screen" style={{ backgroundColor: colors.background }}>
        <Navigation />
        <main className="flex-1 mt-16 flex items-center justify-center">
          <Loader2 className="animate-spin" size={48} style={{ color: colors.accent }} />
        </main>
      </div>
    );
  }

  if (!entry) {
    return (
      <div className="flex flex-col min-h-screen" style={{ backgroundColor: colors.background }}>
        <Navigation />
        <main className="flex-1 mt-16 p-4 md:p-6 max-w-4xl mx-auto w-full">
          <p style={{ color: colors.textSecondary }}>Law entry not found</p>
        </main>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen" style={{ backgroundColor: colors.background }}>
      <Navigation />

      <main className="flex-1 mt-16 md:mb-0 mb-20 p-4 md:p-6 max-w-4xl mx-auto w-full">
        {/* Back Button */}
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 mb-4 px-3 py-2 rounded-lg transition-all hover:scale-105"
          style={{
            backgroundColor: colors.surface,
            color: colors.textSecondary,
          }}
        >
          <ChevronLeft size={18} />
          <span className="text-sm font-semibold">Back</span>
        </button>

        {/* Content */}
        <div
          className="p-6 rounded-xl"
          style={{
            backgroundColor: colors.surface,
            border: `1px solid ${colors.cardBorder}`,
          }}
        >
          {/* Section Number */}
          <div
            className="inline-block px-3 py-1 rounded-lg mb-4"
            style={{ backgroundColor: colors.accent + '20' }}
          >
            <p className="text-sm font-black" style={{ color: colors.accent }}>
              {entry.sectionNumber}
            </p>
          </div>

          {/* Title */}
          <h1 className="text-2xl font-black mb-4" style={{ color: colors.textPrimary }}>
            {entry.title}
          </h1>

          {/* Body */}
          <div
            className="p-4 rounded-lg mb-4"
            style={{ backgroundColor: colors.background }}
          >
            <p className="text-sm leading-relaxed whitespace-pre-wrap" style={{ color: colors.textPrimary }}>
              {entry.bodyText}
            </p>
          </div>

          {/* Copy Button */}
          <button
            onClick={handleCopy}
            className="flex items-center gap-2 px-4 py-2 rounded-lg font-semibold text-sm transition-all hover:scale-105"
            style={{
              backgroundColor: colors.accent,
              color: colors.onAccentContrast,
            }}
          >
            <Copy size={16} />
            Copy Text
          </button>
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
          <p className="text-sm font-semibold">Copied to clipboard</p>
        </div>
      )}
    </div>
  );
}
