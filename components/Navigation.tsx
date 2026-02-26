'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { useTheme } from '@/components/ThemeProvider';
import { Colors } from '@/lib/theme/colors';
import {
  Map,
  Search,
  MessageSquare,
  Scale,
  Calendar,
  Grid3x3,
  Settings,
  Moon,
  Sun
} from 'lucide-react';

const tabs = [
  { name: 'Map', path: '/map', icon: Map },
  { name: 'Search', path: '/search', icon: Search },
  { name: 'Chat', path: '/chat', icon: MessageSquare },
  { name: 'Laws', path: '/laws', icon: Scale },
  { name: 'Calendar', path: '/calendar', icon: Calendar },
  { name: 'Sectors', path: '/sectors', icon: Grid3x3 },
  { name: 'Settings', path: '/settings', icon: Settings },
];

export default function Navigation() {
  const pathname = usePathname();
  const { theme, toggleTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const colors = theme === 'dark' ? Colors.dark : Colors.light;

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return (
    <nav
      className="fixed top-0 left-0 right-0 z-50 border-b"
      style={{
        backgroundColor: colors.surface,
        borderColor: colors.cardBorder,
      }}
    >
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/map" className="flex items-center gap-2">
            <Image
              src="/icon.png"
              alt="NYC Precinct"
              width={40}
              height={40}
              className="rounded-md object-cover"
            />
            <span
              className="text-xl font-black"
              style={{ color: colors.textPrimary }}
            >
              NYC Precinct
            </span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-1">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = pathname === tab.path;

              return (
                <Link
                  key={tab.path}
                  href={tab.path}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg transition-all"
                  style={{
                    backgroundColor: isActive ? colors.accent : 'transparent',
                    color: isActive ? colors.onAccentContrast : colors.textSecondary,
                  }}
                >
                  <Icon size={18} />
                  <span className="text-sm font-semibold">{tab.name}</span>
                </Link>
              );
            })}

            {/* Theme Toggle */}
            <button
              onClick={toggleTheme}
              className="ml-2 p-2 rounded-lg transition-all"
              style={{
                backgroundColor: colors.card,
                color: colors.textSecondary,
              }}
            >
              {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
            </button>
          </div>

          {/* Mobile Theme Toggle */}
          <button
            onClick={toggleTheme}
            className="md:hidden p-2 rounded-lg"
            style={{
              backgroundColor: colors.card,
              color: colors.textSecondary,
            }}
          >
            {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
          </button>
        </div>
      </div>

      {/* Mobile Bottom Navigation */}
      <div
        className="md:hidden fixed bottom-0 left-0 right-0 border-t"
        style={{
          backgroundColor: colors.surface,
          borderColor: colors.cardBorder,
        }}
      >
        <div className="flex items-center justify-around px-2 py-2">
          {tabs.slice(0, 5).map((tab) => {
            const Icon = tab.icon;
            const isActive = pathname === tab.path;

            return (
              <Link
                key={tab.path}
                href={tab.path}
                className="flex flex-col items-center gap-1 px-3 py-2 rounded-lg transition-all"
                style={{
                  color: isActive ? colors.accent : colors.textTertiary,
                }}
              >
                <Icon size={20} />
                <span className="text-xs font-semibold">{tab.name}</span>
              </Link>
            );
          })}
          <Link
            href="/settings"
            className="flex flex-col items-center gap-1 px-3 py-2 rounded-lg transition-all"
            style={{
              color: pathname === '/settings' ? colors.accent : colors.textTertiary,
            }}
          >
            <Settings size={20} />
            <span className="text-xs font-semibold">More</span>
          </Link>
        </div>
      </div>
    </nav>
  );
}
