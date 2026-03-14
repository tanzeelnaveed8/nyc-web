'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useTheme } from '@/components/ThemeProvider';
import { useAppContext } from '@/lib/context/AppContext';
import { Colors } from '@/lib/theme/colors';
import Navigation from '@/components/Navigation';
import {
  getDayInfo,
  getHolidaysInMonth,
  getNextRdoStretch,
  type DayInfo,
} from '@/lib/rdo/rdoEngine';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const SQUAD_COLORS: Record<number, { dark: string; light: string }> = {
  1: { dark: '#60A5FA', light: '#2563EB' },
  2: { dark: '#34D399', light: '#059669' },
  3: { dark: '#FBBF24', light: '#D97706' },
};

export default function CalendarPage() {
  const { theme } = useTheme();
  const { tourHint, setTourHint } = useAppContext();
  const colors = theme === 'dark' ? Colors.dark : Colors.light;

  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [activeSquadFilter, setActiveSquadFilter] = useState<number | null>(null);
  const [ready, setReady] = useState(false);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  useEffect(() => {
    setReady(true);
  }, []);

  useEffect(() => {
    const today = new Date();
    if (today.getFullYear() === year && today.getMonth() === month) {
      setSelectedDay(today.getDate());
    } else {
      setSelectedDay(1);
    }
  }, [year, month]);

  const getSquadColor = useCallback(
    (squad: number): string => {
      const entry = SQUAD_COLORS[squad];
      if (!entry) return colors.accent;
      return theme === 'dark' ? entry.dark : entry.light;
    },
    [theme, colors.accent],
  );

  const monthDayInfos = useMemo(() => {
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const map: Record<number, DayInfo> = {};
    for (let d = 1; d <= daysInMonth; d++) {
      map[d] = getDayInfo(year, month, d);
    }
    return map;
  }, [year, month]);

  const holidaysThisMonth = useMemo(() => getHolidaysInMonth(year, month), [year, month]);

  const selectedDayDetail = useMemo(() => {
    if (selectedDay === null) return null;
    const info = monthDayInfos[selectedDay];
    if (!info) return null;
    const dow = new Date(year, month, selectedDay).getDay();
    const nextStretch = getNextRdoStretch(info.squad, year, month, selectedDay);
    return { ...info, dow, nextStretch };
  }, [selectedDay, monthDayInfos, year, month]);

  const previousMonth = () =>
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  const nextMonth = () =>
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  const goToToday = () => {
    const today = new Date();
    setCurrentDate(new Date(today.getFullYear(), today.getMonth(), 1));
    setSelectedDay(today.getDate());
  };

  const isToday = (day: number) => {
    const today = new Date();
    return (
      day === today.getDate() &&
      month === today.getMonth() &&
      year === today.getFullYear()
    );
  };

  const getDaysInMonth = () => new Date(year, month + 1, 0).getDate();
  const getFirstDayOfMonth = () => new Date(year, month, 1).getDay();

  const TODAY_RING = '#F59E0B';
  const SELECTED_RING = colors.primary;

  const renderCalendar = () => {
    const daysInMonth = getDaysInMonth();
    const firstDay = getFirstDayOfMonth();
    const cells = [];

    for (let i = 0; i < firstDay; i++) {
      cells.push(<div key={`empty-${i}`} className="aspect-square" />);
    }

    for (let day = 1; day <= daysInMonth; day++) {
      const info = monthDayInfos[day];
      const today = isToday(day);
      const isSelected = selectedDay === day;
      const squadColor = getSquadColor(info.squad);
      const dimmed = activeSquadFilter !== null && activeSquadFilter !== info.squad;

      const tileBg = dimmed
        ? `linear-gradient(145deg, ${colors.surfaceElevated}, ${colors.surface})`
        : `linear-gradient(145deg, ${squadColor}30, ${colors.surface})`;

      const tileBorder = today
        ? `2.5px solid ${TODAY_RING}`
        : isSelected
        ? `2px solid ${SELECTED_RING}`
        : `1px solid ${colors.cardBorder}`;

      const tileShadow = today
        ? `0 0 0 2px ${TODAY_RING}50`
        : isSelected
        ? `0 6px 16px ${SELECTED_RING}40`
        : theme === 'dark'
        ? '0 2px 8px rgba(0,0,0,0.3)'
        : '0 2px 8px rgba(15,23,42,0.08)';

      cells.push(
        <button
          key={day}
          onClick={() => setSelectedDay(day)}
          className="aspect-square flex flex-col items-center justify-center rounded-xl transition-all hover:scale-[1.03] cursor-pointer active:scale-[0.98]"
          style={{
            background: tileBg,
            border: tileBorder,
            boxShadow: tileShadow,
            opacity: dimmed ? 0.35 : 1,
          }}
        >
          <p
            className="text-sm font-bold leading-none"
            style={{
              color: today ? TODAY_RING : colors.textPrimary,
              fontWeight: today ? '900' : '700',
            }}
          >
            {day}
          </p>
          <p
            className="text-[10px] font-bold mt-0.5 leading-none"
            style={{ color: dimmed ? colors.textTertiary : squadColor }}
          >
            S{info.squad}
          </p>
          {(info.isPayday || info.holidayName) && (
            <div className="flex gap-0.5 mt-0.5 flex-wrap justify-center">
              {info.isPayday && (
                <span
                  className="text-[8px] font-bold px-1 rounded"
                  style={{ backgroundColor: squadColor + '30', color: colors.textPrimary }}
                >
                  $
                </span>
              )}
              {info.holidayName && (
                <span
                  className="text-[8px] font-bold px-1 rounded"
                  style={{ backgroundColor: colors.error + '30', color: colors.error }}
                >
                  H
                </span>
              )}
            </div>
          )}
        </button>,
      );
    }

    return cells;
  };

  if (!ready) {
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
                <p className="text-sm font-black" style={{ color: colors.textPrimary }}>
                  RDO Calendar
                </p>
                <p className="text-xs mt-1" style={{ color: colors.textSecondary }}>
                  Tap any day to see squad details. Use squad buttons to filter. Matches rdocalendar.com patrol schedule.
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

        {/* Header */}
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

        {/* Month Nav + Squad Filter */}
        <div
          className="p-4 rounded-xl mb-4 md:mb-5"
          style={{ backgroundColor: colors.surface, border: `1px solid ${colors.cardBorder}` }}
        >
          <div className="flex items-center justify-between mb-3">
            <button
              onClick={previousMonth}
              className="p-2 rounded-lg transition-all hover:scale-110"
              style={{ backgroundColor: colors.card }}
            >
              <ChevronLeft size={20} style={{ color: colors.textPrimary }} />
            </button>

            <div className="text-center">
              <h3 className="text-xl font-black" style={{ color: colors.textPrimary }}>
                {MONTHS[month]} {year}
              </h3>
              <p className="text-[10px] font-semibold mt-0.5" style={{ color: colors.textTertiary }}>
                Patrol
              </p>
            </div>

            <button
              onClick={nextMonth}
              className="p-2 rounded-lg transition-all hover:scale-110"
              style={{ backgroundColor: colors.card }}
            >
              <ChevronRight size={20} style={{ color: colors.textPrimary }} />
            </button>
          </div>

          {/* Squad filter buttons + Go to Today */}
          <div className="flex items-center justify-center gap-2 flex-wrap">
            <span className="text-[11px] font-bold mr-1" style={{ color: colors.textTertiary }}>
              Squad:
            </span>
            {[1, 2, 3].map((sq) => {
              const active = activeSquadFilter === sq;
              const sqColor = getSquadColor(sq);
              return (
                <button
                  key={sq}
                  onClick={() => setActiveSquadFilter(active ? null : sq)}
                  className="px-3 py-1.5 rounded-lg text-xs font-bold transition-all"
                  style={{
                    backgroundColor: active ? sqColor : sqColor + '20',
                    color: active ? (theme === 'dark' ? '#111' : '#fff') : sqColor,
                    border: `1.5px solid ${sqColor}`,
                    boxShadow: active ? `0 4px 12px ${sqColor}50` : 'none',
                  }}
                >
                  S{sq}
                </button>
              );
            })}
            <button
              onClick={goToToday}
              className="ml-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all"
              style={{
                backgroundColor: TODAY_RING + '20',
                color: TODAY_RING,
                border: `1.5px solid ${TODAY_RING}`,
              }}
            >
              Today
            </button>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-12 md:gap-5">
          {/* Calendar grid */}
          <div className="md:col-span-8">
            <div
              className="p-3 sm:p-4 rounded-xl mb-4"
              style={{ backgroundColor: colors.surface, border: `1px solid ${colors.cardBorder}` }}
            >
              <div className="grid grid-cols-7 gap-1.5 sm:gap-2 mb-2">
                {WEEKDAYS.map((d, i) => (
                  <div key={d} className="text-center">
                    <p
                      className="text-[11px] sm:text-xs font-bold uppercase tracking-wider"
                      style={{ color: i === 0 || i === 6 ? colors.error : colors.textTertiary }}
                    >
                      {d}
                    </p>
                  </div>
                ))}
              </div>
              <div className="h-px mb-2" style={{ backgroundColor: colors.divider }} />
              <div className="grid grid-cols-7 gap-1.5 sm:gap-2">{renderCalendar()}</div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="md:col-span-4 md:sticky md:top-20 self-start space-y-4">
            {/* Selected Day Detail Card */}
            {selectedDayDetail && selectedDay !== null && (
              <div
                className="p-4 rounded-xl"
                style={{
                  background: `linear-gradient(140deg, ${getSquadColor(selectedDayDetail.squad)}18, ${colors.surface})`,
                  border: `1px solid ${getSquadColor(selectedDayDetail.squad)}55`,
                  boxShadow: `0 8px 20px ${getSquadColor(selectedDayDetail.squad)}20`,
                }}
              >
                <div className="flex flex-col sm:flex-row gap-3">
                  <div
                    className="w-16 h-16 rounded-xl flex flex-col items-center justify-center flex-shrink-0"
                    style={{
                      background: `linear-gradient(145deg, ${getSquadColor(selectedDayDetail.squad)}35, ${getSquadColor(selectedDayDetail.squad)}15)`,
                      boxShadow: `0 4px 12px ${getSquadColor(selectedDayDetail.squad)}30`,
                    }}
                  >
                    <p className="text-2xl font-black" style={{ color: getSquadColor(selectedDayDetail.squad) }}>
                      {selectedDay}
                    </p>
                    <p className="text-[10px] font-bold" style={{ color: getSquadColor(selectedDayDetail.squad) }}>
                      {WEEKDAYS[selectedDayDetail.dow]}
                    </p>
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="text-base font-black" style={{ color: colors.textPrimary }}>
                      {DAY_NAMES[selectedDayDetail.dow]}
                    </p>
                    <p className="text-xs mb-2" style={{ color: colors.textTertiary }}>
                      {MONTHS[month]} {selectedDay}, {year}
                    </p>

                    <p className="text-sm font-bold" style={{ color: getSquadColor(selectedDayDetail.squad) }}>
                      Squad {selectedDayDetail.squad} — RDO
                    </p>

                    {selectedDayDetail.holidayName && (
                      <p className="text-xs font-semibold mt-1" style={{ color: colors.error }}>
                        {selectedDayDetail.holidayName}
                      </p>
                    )}

                    {selectedDayDetail.isPayday && (
                      <p className="text-xs font-semibold mt-1" style={{ color: '#10B981' }}>
                        $ Payday
                      </p>
                    )}

                    <div className="flex flex-wrap gap-2 mt-2">
                      {selectedDayDetail.isPayday && (
                        <span
                          className="text-[10px] font-bold px-2 py-0.5 rounded"
                          style={{ backgroundColor: '#10B98125', color: '#10B981' }}
                        >
                          $
                        </span>
                      )}
                      {selectedDayDetail.holidayName && (
                        <span
                          className="text-[10px] font-bold px-2 py-0.5 rounded"
                          style={{ backgroundColor: colors.error + '25', color: colors.error }}
                        >
                          H
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* RDO stretch / countdown */}
                {selectedDayDetail.nextStretch && (
                  <div
                    className="mt-3 p-3 rounded-lg"
                    style={{
                      backgroundColor: getSquadColor(selectedDayDetail.squad) + '12',
                      border: `1px solid ${getSquadColor(selectedDayDetail.squad)}30`,
                    }}
                  >
                    {selectedDayDetail.nextStretch.daysUntil === 0 ? (
                      <p className="text-xs font-bold" style={{ color: getSquadColor(selectedDayDetail.squad) }}>
                        Currently in RDO stretch ({selectedDayDetail.nextStretch.length} day
                        {selectedDayDetail.nextStretch.length > 1 ? 's' : ''})
                      </p>
                    ) : (
                      <p className="text-xs font-bold" style={{ color: getSquadColor(selectedDayDetail.squad) }}>
                        Next S{selectedDayDetail.squad} RDO in {selectedDayDetail.nextStretch.daysUntil} day
                        {selectedDayDetail.nextStretch.daysUntil > 1 ? 's' : ''} ({selectedDayDetail.nextStretch.length}{' '}
                        day stretch)
                      </p>
                    )}
                    <p className="text-[10px] mt-0.5" style={{ color: colors.textTertiary }}>
                      {selectedDayDetail.nextStretch.startDate} — {selectedDayDetail.nextStretch.endDate}
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Legend */}
            <div
              className="p-4 rounded-xl"
              style={{
                background: `linear-gradient(145deg, ${colors.surfaceElevated}, ${colors.surface})`,
                border: `1px solid ${colors.outline}`,
                boxShadow: theme === 'dark' ? '0 6px 16px rgba(0,0,0,0.3)' : '0 6px 16px rgba(15,23,42,0.08)',
              }}
            >
              <h3 className="text-xs font-bold mb-3 uppercase tracking-wider" style={{ color: colors.textTertiary }}>
                Legend
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-1 gap-2.5">
                {[1, 2, 3].map((sq) => (
                  <div key={sq} className="flex items-center gap-2">
                    <span
                      className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold"
                      style={{
                        background: `linear-gradient(145deg, ${getSquadColor(sq)}35, ${getSquadColor(sq)}15)`,
                        color: getSquadColor(sq),
                        border: `1px solid ${getSquadColor(sq)}80`,
                      }}
                    >
                      S{sq}
                    </span>
                    <p className="text-xs font-semibold" style={{ color: colors.textPrimary }}>
                      Squad {sq} RDO
                    </p>
                  </div>
                ))}
                <div className="flex items-center gap-2">
                  <span
                    className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold"
                    style={{
                      background: 'linear-gradient(145deg, #10B98135, #10B98115)',
                      color: '#10B981',
                      border: '1px solid #10B98180',
                    }}
                  >
                    $
                  </span>
                  <p className="text-xs font-semibold" style={{ color: colors.textPrimary }}>
                    Payday
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold"
                    style={{
                      background: `linear-gradient(145deg, ${colors.error}35, ${colors.error}15)`,
                      color: colors.error,
                      border: `1px solid ${colors.error}80`,
                    }}
                  >
                    H
                  </span>
                  <p className="text-xs font-semibold" style={{ color: colors.textPrimary }}>
                    Holiday
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className="w-7 h-7 rounded-lg flex items-center justify-center border-2"
                    style={{
                      borderColor: TODAY_RING,
                      background: `linear-gradient(145deg, ${TODAY_RING}25, ${TODAY_RING}10)`,
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

            {/* Holidays this month */}
            {holidaysThisMonth.length > 0 && (
              <div
                className="p-4 rounded-xl"
                style={{
                  background: `linear-gradient(145deg, ${colors.surfaceElevated}, ${colors.surface})`,
                  border: `1px solid ${colors.outline}`,
                }}
              >
                <h3 className="text-xs font-bold mb-3 uppercase tracking-wider" style={{ color: colors.textTertiary }}>
                  Holidays
                </h3>
                <div className="space-y-2">
                  {holidaysThisMonth.map((h) => (
                    <div key={h.day} className="flex items-center gap-2">
                      <span
                        className="text-[10px] font-bold w-6 text-center"
                        style={{ color: colors.error }}
                      >
                        {h.day}
                      </span>
                      <p className="text-xs font-semibold" style={{ color: colors.textPrimary }}>
                        {h.name}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <p className="text-[10px] text-center md:text-left px-1" style={{ color: colors.textTertiary }}>
              Source: rdocalendar.com · Patrol
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
