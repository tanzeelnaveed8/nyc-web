'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useTheme } from '@/components/ThemeProvider';
import { Colors } from '@/lib/theme/colors';
import Navigation from '@/components/Navigation';
import { getEntriesByCategory, getAllCategories } from '@/lib/db/lawRepository';
import type { LawEntry, LawCategory } from '@/types';
import { ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';

export default function CategoryPage() {
  const { theme } = useTheme();
  const router = useRouter();
  const params = useParams();
  const categoryId = params.categoryId as string;
  const colors = theme === 'dark' ? Colors.dark : Colors.light;

  const [category, setCategory] = useState<LawCategory | null>(null);
  const [entries, setEntries] = useState<LawEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [categoryId]);

  const loadData = async () => {
    try {
      const categories = await getAllCategories();
      const cat = categories.find(c => c.categoryId === categoryId);
      setCategory(cat || null);

      const lawEntries = await getEntriesByCategory(categoryId);
      setEntries(lawEntries);
    } catch (error) {
      console.error('[Category] Load error:', error);
    } finally {
      setLoading(false);
    }
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

  if (!category) {
    return (
      <div className="flex flex-col min-h-screen" style={{ backgroundColor: colors.background }}>
        <Navigation />
        <main className="flex-1 mt-16 p-4 md:p-6 max-w-4xl mx-auto w-full">
          <p style={{ color: colors.textSecondary }}>Category not found</p>
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

        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-black mb-2" style={{ color: colors.textPrimary }}>
            {category.name}
          </h1>
          <p className="text-sm" style={{ color: colors.textSecondary }}>
            {entries.length} entries
          </p>
        </div>

        {/* Entries */}
        <div className="space-y-2">
          {entries.map((entry) => (
            <button
              key={entry.entryId}
              onClick={() => router.push(`/laws/${entry.entryId}`)}
              className="w-full text-left p-4 rounded-xl transition-all hover:scale-[1.02]"
              style={{
                backgroundColor: colors.surface,
                border: `1px solid ${colors.cardBorder}`,
              }}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <p className="text-xs font-bold mb-1" style={{ color: colors.accent }}>
                    {entry.sectionNumber}
                  </p>
                  <p className="text-sm font-bold mb-1" style={{ color: colors.textPrimary }}>
                    {entry.title}
                  </p>
                  <p className="text-xs line-clamp-2" style={{ color: colors.textSecondary }}>
                    {entry.bodyText}
                  </p>
                </div>
                <ChevronRight size={18} style={{ color: colors.textTertiary }} className="flex-shrink-0 mt-1" />
              </div>
            </button>
          ))}
        </div>
      </main>
    </div>
  );
}
