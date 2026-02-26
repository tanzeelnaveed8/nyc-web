'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useTheme } from '@/components/ThemeProvider';
import { Colors } from '@/lib/theme/colors';
import Navigation from '@/components/Navigation';
import { getAllCategories, searchLaws } from '@/lib/db/lawRepository';
import type { LawCategory, LawEntry } from '@/types';
import { Scale, BookOpen, FileText, Search as SearchIcon, Loader2, ChevronRight } from 'lucide-react';

export default function LawsPage() {
  const { theme } = useTheme();
  const router = useRouter();
  const colors = theme === 'dark' ? Colors.dark : Colors.light;

  const [categories, setCategories] = useState<LawCategory[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<LawEntry[]>([]);
  const [searching, setSearching] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadCategories();
  }, []);

  const loadCategories = async () => {
    try {
      const cats = await getAllCategories();
      setCategories(cats);
    } catch (error) {
      console.error('[Laws] Load error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async (query: string) => {
    setSearchQuery(query);

    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    setSearching(true);
    try {
      const results = await searchLaws(query);
      setSearchResults(results);
    } catch (error) {
      console.error('[Laws] Search error:', error);
    } finally {
      setSearching(false);
    }
  };

  const getCategoryIcon = (categoryId: string) => {
    switch (categoryId) {
      case 'penal':
        return Scale;
      case 'cpl':
        return FileText;
      case 'vtl':
        return BookOpen;
      default:
        return FileText;
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

  return (
    <div className="flex flex-col min-h-screen" style={{ backgroundColor: colors.background }}>
      <Navigation />

      <main className="flex-1 mt-16 md:mb-0 mb-20 p-4 md:p-6 max-w-4xl mx-auto w-full">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-black mb-2" style={{ color: colors.textPrimary }}>
            NYC Laws
          </h1>
          <p className="text-sm" style={{ color: colors.textSecondary }}>
            Browse New York State laws and regulations
          </p>
        </div>

        {/* Search */}
        <div className="mb-6">
          <div
            className="flex items-center gap-3 p-4 rounded-xl border-2"
            style={{
              backgroundColor: colors.surface,
              borderColor: colors.outline,
            }}
          >
            <SearchIcon size={20} style={{ color: colors.textTertiary }} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
              placeholder="Search laws by title, section, or content..."
              className="flex-1 bg-transparent outline-none text-sm font-semibold"
              style={{ color: colors.textPrimary }}
            />
            {searching && <Loader2 className="animate-spin" size={20} style={{ color: colors.accent }} />}
          </div>
        </div>

        {/* Search Results */}
        {searchQuery && (
          <div className="mb-6">
            <h2 className="text-lg font-black mb-3" style={{ color: colors.textPrimary }}>
              Search Results ({searchResults.length})
            </h2>
            {searchResults.length > 0 ? (
              <div className="space-y-2">
                {searchResults.map((entry) => (
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
            ) : (
              <div
                className="p-6 rounded-xl text-center"
                style={{
                  backgroundColor: colors.surface,
                  border: `1px solid ${colors.cardBorder}`,
                }}
              >
                <SearchIcon size={32} style={{ color: colors.textTertiary }} className="mx-auto mb-2" />
                <p className="text-sm font-semibold" style={{ color: colors.textSecondary }}>
                  No results found
                </p>
              </div>
            )}
          </div>
        )}

        {/* Categories */}
        {!searchQuery && (
          <div>
            <h2 className="text-lg font-black mb-3" style={{ color: colors.textPrimary }}>
              Law Categories
            </h2>
            <div className="space-y-3">
              {categories.map((category) => {
                const Icon = getCategoryIcon(category.categoryId);
                return (
                  <button
                    key={category.categoryId}
                    onClick={() => router.push(`/laws/category/${category.categoryId}`)}
                    className="w-full flex items-start gap-4 p-4 rounded-xl transition-all hover:scale-[1.02]"
                    style={{
                      backgroundColor: colors.surface,
                      border: `1px solid ${colors.cardBorder}`,
                    }}
                  >
                    <div
                      className="p-3 rounded-lg flex-shrink-0"
                      style={{ backgroundColor: colors.accent + '20' }}
                    >
                      <Icon size={24} style={{ color: colors.accent }} />
                    </div>
                    <div className="flex-1 text-left">
                      <h3 className="text-lg font-black mb-1" style={{ color: colors.textPrimary }}>
                        {category.name}
                      </h3>
                      <p className="text-sm" style={{ color: colors.textSecondary }}>
                        {category.entryCount} entries
                      </p>
                    </div>
                    <ChevronRight size={20} style={{ color: colors.textTertiary }} className="flex-shrink-0 mt-2" />
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
