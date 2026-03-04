'use client';

import { useState, useEffect, useMemo } from 'react';
import { useTheme } from '@/components/ThemeProvider';
import { useAppContext } from '@/lib/context/AppContext';
import { Colors } from '@/lib/theme/colors';
import Navigation from '@/components/Navigation';
import type { RdoCalendarYear, RdoCalendarDay } from '@/types';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

function dateKey(year: number, month: number, day: number): string {
  const m = String(month + 1).padStart(2, '0');
  const d = String(day).padStart(2, '0');
  return `${year}-${m}-${d}`;
}

export default function CalendarPage() {
  const { theme } = useTheme();
  const { tourHint, setTourHint } = useAppContext();
  const colors = theme === 'dark' ? Colors.dark : Colors.light;

  const [calendarData, setCalendarData] = useState<RdoCalendarYear | null>(null);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  useEffect(() => {
    loadCalendar();
  }, []);

  useEffect(() => {
    const today = new Date();
    if (today.getFullYear() === year && today.getMonth() === month) {
      setSelectedDay(today.getDate());
    } else {
      setSelectedDay(1);
    }
  }, [year, month]);

  const loadCalendar = async () => {
    try {
      const data = await import('@/data/rdoCalendar.json');
      setCalendarData(data.default as RdoCalendarYear);
    } catch (error) {
      console.error('[Calendar] Load error:', error);
    } finally {
      setLoading(false);
    }
  };

  const getDayData = useMemo(() => {
    return (day: number): RdoCalendarDay | null => {
      if (!calendarData?.days) return null;
      const key = dateKey(year, month, day);
      return calendarData.days[key] ?? null;
    };
  }, [calendarData, year, month]);

  const selectedDayInfo = useMemo(() => {
    if (selectedDay === null || !calendarData) return null;
    const dayOfWeek = new Date(year, month, selectedDay).getDay();
    const dayData = getDayData(selectedDay);
    return {
      dayName: DAY_NAMES[dayOfWeek],
      dayShort: WEEKDAYS[dayOfWeek],
      date: `${MONTHS[month]} ${selectedDay}, ${year}`,
      group: dayData?.group ?? '—',
      flags: dayData?.flags ?? [],
      legend: calendarData.legend || {},
    };
  }, [selectedDay, calendarData, getDayData, year, month]);

  const previousMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const isToday = (day: number) => {
    const today = new Date();
    return (
      day === today.getDate() &&
      currentDate.getMonth() === today.getMonth() &&
      currentDate.getFullYear() === today.getFullYear()
    );
  };

  const getDaysInMonth = () => new Date(year, month + 1, 0).getDate();
  const getFirstDayOfMonth = () => new Date(year, month, 1).getDay();

  const TODAY_RING = colors.primary;

  const getGroupColor = (group: string): string => {
    const byGroup: Record<string, string> = {
      '1': colors.primary,
      '2': colors.success,
      '3': colors.accent,
      '4': colors.warning,
      '5': colors.error,
    };
    return byGroup[group] || colors.accent;
  };

  const renderCalendar = () => {
    const daysInMonth = getDaysInMonth();
    const firstDay = getFirstDayOfMonth();
    const days = [];

    for (let i = 0; i < firstDay; i++) {
      days.push(<div key={`empty-${i}`} className="aspect-square" />);
    }

    for (let day = 1; day <= daysInMonth; day++) {
      const dayData = getDayData(day);
      const today = isToday(day);
      const isSelected = selectedDay === day;
      const group = dayData?.group ?? '—';
      const flags = dayData?.flags ?? [];
      const groupColor = getGroupColor(group);

      const tileShadow = isSelected
        ? `0 8px 20px ${groupColor}55, inset 0 -2px 0 ${groupColor}AA`
        : today
        ? `0 6px 16px ${TODAY_RING}40, inset 0 -2px 0 ${TODAY_RING}80`
        : theme === 'dark'
        ? '0 4px 12px rgba(0, 0, 0, 0.35), inset 0 -1px 0 rgba(255,255,255,0.05)'
        : '0 4px 12px rgba(15, 23, 42, 0.12), inset 0 -1px 0 rgba(0,0,0,0.08)';

      days.push(
        <button
          key={day}
          onClick={() => setSelectedDay(day)}
          className="aspect-square flex flex-col items-center justify-center rounded-xl transition-all hover:scale-[1.03] cursor-pointer active:scale-[0.98]"
          style={{
            background:
              group !== '—'
                ? `linear-gradient(145deg, ${groupColor}35, ${colors.surface})`
                : `linear-gradient(145deg, ${colors.surfaceElevated}, ${colors.surface})`,
            border: today
              ? `2.5px solid ${TODAY_RING}`
              : isSelected
              ? `2px solid ${groupColor}`
              : `1px solid ${colors.cardBorder}`,
            boxShadow: tileShadow,
          }}
        >
          <p
            className="text-sm font-bold"
            style={{ color: colors.textPrimary, fontWeight: today ? '900' : '700' }}
          >
            {day}
          </p>
          <p className="text-[10px] font-bold mt-0.5" style={{ color: groupColor }}>
            G{group}
          </p>
          {flags.length > 0 && (
            <div className="flex gap-0.5 mt-0.5 flex-wrap justify-center max-w-full">
              {flags.map((f) => (
                <span
                  key={f}
                  className="text-[8px] font-bold px-1 rounded"
                  style={{
                    backgroundColor: groupColor + '35',
                    color: colors.textPrimary,
                  }}
                >
                  {f}
                </span>
              ))}
            </div>
          )}
        </button>
      );
    }

    return days;
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

      <main className="flex-1 mt-16 md:mb-0 mb-20 p-4 md:p-6 max-w-6xl mx-auto w-full">
        {tourHint === 'calendar' && (
          <div
            className="mb-4 p-3 rounded-xl"
            style={{ backgroundColor: colors.surface, border: `1px solid ${colors.cardBorder}` }}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-black" style={{ color: colors.textPrimary }}>RDO Calendar</p>
                <p className="text-xs mt-1" style={{ color: colors.textSecondary }}>
                  Tap any day to see group and flags (holiday, payday, etc.). No precinct – patrol RDO only.
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

        {/* Header: RDO Calendar > February 2026 */}
        <div className="mb-4 md:mb-6">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ backgroundColor: colors.primary + '20' }}
            >
              <CalendarIcon size={20} style={{ color: colors.primary }} />
            </div>
            <h1 className="text-2xl md:text-3xl font-black" style={{ color: colors.textPrimary }}>
              RDO Calendar
            </h1>
          </div>
        </div>

        {/* Month Navigation */}
        <div
          className="p-4 rounded-xl mb-4 md:mb-5"
          style={{
            backgroundColor: colors.surface,
            border: `1px solid ${colors.cardBorder}`,
          }}
        >
          <div className="flex items-center justify-between">
            <button
              onClick={previousMonth}
              className="p-2 rounded-lg transition-all hover:scale-110"
              style={{ backgroundColor: colors.card }}
            >
              <ChevronLeft size={20} style={{ color: colors.textPrimary }} />
            </button>

            <h3 className="text-xl font-black" style={{ color: colors.textPrimary }}>
              {MONTHS[month]} {year}
            </h3>

            <button
              onClick={nextMonth}
              className="p-2 rounded-lg transition-all hover:scale-110"
              style={{ backgroundColor: colors.card }}
            >
              <ChevronRight size={20} style={{ color: colors.textPrimary }} />
            </button>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-12 md:gap-5">
          <div className="md:col-span-8">
            {/* Calendar Grid */}
            <div
              className="p-3 sm:p-4 rounded-xl mb-4"
              style={{
                backgroundColor: colors.surface,
                border: `1px solid ${colors.cardBorder}`,
              }}
            >
              <div className="grid grid-cols-7 gap-1.5 sm:gap-2 mb-2">
                {WEEKDAYS.map((day, i) => (
                  <div key={day} className="text-center">
                    <p
                      className="text-[11px] sm:text-xs font-bold uppercase tracking-wider"
                      style={{ color: i === 0 || i === 6 ? colors.error : colors.textTertiary }}
                    >
                      {day}
                    </p>
                  </div>
                ))}
              </div>
              <div className="h-px mb-2" style={{ backgroundColor: colors.divider }} />
              <div className="grid grid-cols-7 gap-1.5 sm:gap-2">{renderCalendar()}</div>
            </div>
          </div>

          <div className="md:col-span-4 md:sticky md:top-20 self-start space-y-4">
            {/* Selected Day Detail */}
            {selectedDayInfo && (
              <div
                className="p-4 rounded-xl"
                style={{
                  background: `linear-gradient(140deg, ${getGroupColor(selectedDayInfo.group)}22, ${colors.surface})`,
                  border: `1px solid ${getGroupColor(selectedDayInfo.group)}66`,
                  boxShadow: `0 10px 24px ${getGroupColor(selectedDayInfo.group)}30`,
                }}
              >
                <div className="flex flex-col sm:flex-row gap-3">
                  <div
                    className="w-16 h-16 rounded-xl flex flex-col items-center justify-center flex-shrink-0"
                    style={{
                      background: `linear-gradient(145deg, ${getGroupColor(selectedDayInfo.group)}40, ${getGroupColor(selectedDayInfo.group)}20)`,
                      boxShadow: `0 6px 16px ${getGroupColor(selectedDayInfo.group)}40`,
                    }}
                  >
                    <p className="text-2xl font-black" style={{ color: getGroupColor(selectedDayInfo.group) }}>
                      {selectedDay}
                    </p>
                    <p className="text-[10px] font-bold" style={{ color: getGroupColor(selectedDayInfo.group) }}>
                      {selectedDayInfo.dayShort}
                    </p>
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="text-base font-black" style={{ color: colors.textPrimary }}>
                      {selectedDayInfo.dayName}
                    </p>
                    <p className="text-xs mb-2" style={{ color: colors.textTertiary }}>
                      {selectedDayInfo.date}
                    </p>
                    <p className="text-sm font-bold" style={{ color: getGroupColor(selectedDayInfo.group) }}>
                      Group {selectedDayInfo.group}
                    </p>
                    {selectedDayInfo.flags.length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-2">
                        {selectedDayInfo.flags.map((f) => (
                          <span
                            key={f}
                            className="text-xs font-semibold px-2 py-1 rounded"
                            style={{
                              backgroundColor: getGroupColor(selectedDayInfo.group) + '25',
                              color: getGroupColor(selectedDayInfo.group),
                            }}
                          >
                            {f}: {selectedDayInfo.legend[f] ?? f}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Legend */}
            {calendarData?.legend && Object.keys(calendarData.legend).length > 0 && (
              <div
                className="p-4 rounded-xl"
                style={{
                  background: `linear-gradient(145deg, ${colors.surfaceElevated}, ${colors.surface})`,
                  border: `1px solid ${colors.outline}`,
                  boxShadow: theme === 'dark'
                    ? '0 8px 20px rgba(0,0,0,0.35)'
                    : '0 8px 20px rgba(15,23,42,0.10)',
                }}
              >
                <h3 className="text-xs font-bold mb-3 uppercase tracking-wider" style={{ color: colors.textTertiary }}>
                  Legend
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-1 gap-3">
                  {calendarData.groups?.map((groupId) => (
                    <div key={groupId} className="flex items-center gap-2">
                      <span
                        className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold"
                        style={{
                          background: `linear-gradient(145deg, ${getGroupColor(groupId)}40, ${getGroupColor(groupId)}20)`,
                          color: theme === 'dark' ? colors.textPrimary : colors.depth,
                          boxShadow: `0 4px 10px ${getGroupColor(groupId)}40`,
                          border: `1px solid ${getGroupColor(groupId)}88`,
                        }}
                      >
                        G{groupId}
                      </span>
                      <p className="text-xs font-semibold" style={{ color: colors.textPrimary }}>
                        Squad Group {groupId}
                      </p>
                    </div>
                  ))}
                  {Object.entries(calendarData.legend).map(([flag, label]) => (
                    <div key={flag} className="flex items-center gap-2">
                      <span
                        className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold"
                        style={{
                          background: `linear-gradient(145deg, ${colors.accent}40, ${colors.accent}20)`,
                          color: theme === 'dark' ? colors.textPrimary : colors.depth,
                          border: `1px solid ${colors.accent}88`,
                        }}
                      >
                        {flag}
                      </span>
                      <p className="text-xs font-semibold" style={{ color: colors.textPrimary }}>
                        {label}
                      </p>
                    </div>
                  ))}
                  <div className="flex items-center gap-2">
                    <span
                      className="w-7 h-7 rounded-lg flex items-center justify-center border-2"
                      style={{
                        borderColor: TODAY_RING,
                        background: `linear-gradient(145deg, ${TODAY_RING}30, ${TODAY_RING}12)`,
                        boxShadow: `0 4px 10px ${TODAY_RING}40`,
                      }}
                    >
                      <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: TODAY_RING }} />
                    </span>
                    <p className="text-xs font-semibold" style={{ color: colors.textPrimary }}>
                      Today
                    </p>
                  </div>
                </div>
              </div>
            )}

            {calendarData?.source && (
              <p className="text-[10px] text-center md:text-left px-1" style={{ color: colors.textTertiary }}>
                Source: {calendarData.source} · Role: {calendarData.role}
              </p>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
