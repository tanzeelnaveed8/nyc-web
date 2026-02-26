'use client';

import { useState, useEffect, useMemo } from 'react';
import { useTheme } from '@/components/ThemeProvider';
import { useAppContext } from '@/lib/context/AppContext';
import { Colors } from '@/lib/theme/colors';
import Navigation from '@/components/Navigation';
import { getAllPrecincts } from '@/lib/db/database';
import type { Precinct } from '@/types';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, Loader2, Building2, Clock } from 'lucide-react';

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

export default function CalendarPage() {
  const { theme } = useTheme();
  const { tourHint, setTourHint } = useAppContext();
  const colors = theme === 'dark' ? Colors.dark : Colors.light;

  const [precincts, setPrecincts] = useState<Precinct[]>([]);
  const [selectedPrecinct, setSelectedPrecinct] = useState<Precinct | null>(null);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  useEffect(() => {
    loadPrecincts();
  }, []);

  useEffect(() => {
    const today = new Date();
    if (today.getFullYear() === year && today.getMonth() === month) {
      setSelectedDay(today.getDate());
    } else {
      setSelectedDay(1);
    }
  }, [year, month]);

  const loadPrecincts = async () => {
    try {
      const allPrecincts = await getAllPrecincts();
      const sorted = allPrecincts.sort((a, b) => a.precinctNum - b.precinctNum);
      setPrecincts(sorted);
      if (sorted.length > 0) {
        setSelectedPrecinct(sorted[0]);
      }
    } catch (error) {
      console.error('[Calendar] Load error:', error);
    } finally {
      setLoading(false);
    }
  };

  const openingHours = useMemo(
    () => selectedPrecinct?.openingHours ?? [],
    [selectedPrecinct]
  );
  const hasHoursData = openingHours.length > 0;

  const precinctMonthSchedule = useMemo(() => {
    const result: Record<number, { isOpen: boolean; hours: string }> = {};
    if (!hasHoursData) return result;

    const daysInMonth = new Date(year, month + 1, 0).getDate();
    for (let day = 1; day <= daysInMonth; day++) {
      const dayOfWeek = new Date(year, month, day).getDay();
      const dayHours = openingHours[dayOfWeek];
      if (dayHours) {
        result[day] = { isOpen: dayHours.isOpen, hours: dayHours.hours };
      }
    }
    return result;
  }, [openingHours, hasHoursData, year, month]);

  const stats = useMemo(() => {
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    if (!hasHoursData) return { open: 0, closed: 0, total: daysInMonth };

    const entries = Object.values(precinctMonthSchedule);
    const open = entries.filter(e => e.isOpen).length;
    const closed = entries.filter(e => !e.isOpen).length;
    return { open, closed, total: entries.length };
  }, [precinctMonthSchedule, hasHoursData, year, month]);

  const selectedDayInfo = useMemo(() => {
    if (selectedDay === null) return null;
    const dayOfWeek = new Date(year, month, selectedDay).getDay();
    const dayInfo = precinctMonthSchedule[selectedDay];
    return {
      dayName: DAY_NAMES[dayOfWeek],
      dayShort: WEEKDAYS[dayOfWeek],
      date: `${MONTHS[month]} ${selectedDay}, ${year}`,
      isOpen: dayInfo?.isOpen ?? true,
      hours: dayInfo?.hours || (hasHoursData ? 'No data' : 'Hours not loaded yet'),
    };
  }, [selectedDay, precinctMonthSchedule, hasHoursData, year, month]);

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

  const getDaysInMonth = () => {
    return new Date(year, month + 1, 0).getDate();
  };

  const getFirstDayOfMonth = () => {
    return new Date(year, month, 1).getDay();
  };

  const renderCalendar = () => {
    const daysInMonth = getDaysInMonth();
    const firstDay = getFirstDayOfMonth();
    const days = [];

    const OPEN_COLOR = '#4CAF50';
    const CLOSED_COLOR = '#D32F2F';
    const TODAY_RING = '#2979FF';

    // Empty cells for days before month starts
    for (let i = 0; i < firstDay; i++) {
      days.push(
        <div key={`empty-${i}`} className="aspect-square" />
      );
    }

    // Days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const dayInfo = precinctMonthSchedule[day];
      const isOpen = dayInfo?.isOpen ?? true;
      const today = isToday(day);
      const isSelected = selectedDay === day;
      const cellColor = hasHoursData ? (isOpen ? OPEN_COLOR : CLOSED_COLOR) : colors.textTertiary;

      days.push(
        <button
          key={day}
          onClick={() => setSelectedDay(day)}
          className="aspect-square flex items-center justify-center rounded-lg transition-all hover:opacity-80 cursor-pointer"
          style={{
            backgroundColor: hasHoursData
              ? (theme === 'dark' ? `${cellColor}30` : `${cellColor}12`)
              : (theme === 'dark' ? colors.surface : '#F0F0F0'),
            border: today
              ? `2.5px solid ${TODAY_RING}`
              : isSelected
              ? `2px solid ${colors.accent}`
              : 'none',
          }}
        >
          <div className="text-center">
            <p
              className="text-sm font-bold"
              style={{
                color: hasHoursData ? cellColor : colors.textPrimary,
                fontWeight: today ? '900' : '700',
              }}
            >
              {day}
            </p>
            <p
              className="text-[7px] font-bold mt-[-2px]"
              style={{
                color: hasHoursData ? cellColor : colors.textTertiary,
                opacity: 0.8,
                letterSpacing: '0.5px',
              }}
            >
              {hasHoursData ? (isOpen ? 'OPEN' : 'OFF') : '—'}
            </p>
          </div>
        </button>
      );
    }

    return days;
  };

  const OPEN_COLOR = '#4CAF50';
  const CLOSED_COLOR = '#D32F2F';
  const TODAY_RING = '#2979FF';

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
        {tourHint === 'calendar' && (
          <div
            className="mb-4 p-3 rounded-xl"
            style={{ backgroundColor: colors.surface, border: `1px solid ${colors.cardBorder}` }}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-black" style={{ color: colors.textPrimary }}>Calendar Tutorial</p>
                <p className="text-xs mt-1" style={{ color: colors.textSecondary }}>
                  Choose a precinct, then tap any day to view opening hours and closed/RDO pattern.
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
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-2">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ backgroundColor: colors.primary + '20' }}
            >
              <CalendarIcon size={20} style={{ color: colors.primary }} />
            </div>
            <h1 className="text-3xl font-black" style={{ color: colors.textPrimary }}>
              Precinct Hours
            </h1>
          </div>
          <p className="text-sm" style={{ color: colors.textSecondary }}>
            {selectedPrecinct ? selectedPrecinct.name : 'Select a precinct to view opening hours'}
          </p>
        </div>

        {/* Precinct Selector */}
        <div className="mb-6">
          <h2 className="text-xs font-bold mb-3 uppercase tracking-wider" style={{ color: colors.textTertiary }}>
            Select Precinct
          </h2>
          <div className="flex gap-2 overflow-x-auto pb-2">
            {precincts.map((precinct) => (
              <button
                key={precinct.precinctNum}
                onClick={() => setSelectedPrecinct(precinct)}
                className="px-4 py-2 rounded-lg font-bold text-sm whitespace-nowrap transition-all hover:opacity-90 flex items-center gap-2"
                style={{
                  backgroundColor:
                    selectedPrecinct?.precinctNum === precinct.precinctNum ? colors.accent : colors.surface,
                  color:
                    selectedPrecinct?.precinctNum === precinct.precinctNum
                      ? colors.onAccentContrast
                      : colors.textSecondary,
                  border: `1px solid ${colors.cardBorder}`,
                }}
              >
                <Building2 size={12} />
                {precinct.precinctNum}
              </button>
            ))}
          </div>
        </div>

        {/* Month Navigation & Stats */}
        {selectedPrecinct && (
          <>
            {/* Month Navigation */}
            <div
              className="p-4 rounded-xl mb-4"
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

                <div className="text-center">
                  <h3 className="text-xl font-black" style={{ color: colors.textPrimary }}>
                    {currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                  </h3>
                  <p className="text-xs mt-1" style={{ color: colors.textTertiary }}>
                    {selectedPrecinct.borough}
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
            </div>

            {/* Stats */}
            <div className="flex gap-3 mb-4">
              <div
                className="flex-1 flex flex-col items-center py-3 rounded-xl"
                style={{
                  backgroundColor: hasHoursData ? `${OPEN_COLOR}12` : (theme === 'dark' ? colors.surface : '#F5F5F5'),
                  border: `1px solid ${hasHoursData ? `${OPEN_COLOR}30` : colors.cardBorder}`,
                }}
              >
                <div
                  className="w-2 h-2 rounded-full mb-1"
                  style={{ backgroundColor: hasHoursData ? OPEN_COLOR : colors.textTertiary }}
                />
                <p className="text-2xl font-black" style={{ color: hasHoursData ? OPEN_COLOR : colors.textTertiary }}>
                  {hasHoursData ? stats.open : '—'}
                </p>
                <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: hasHoursData ? OPEN_COLOR : colors.textTertiary }}>
                  Open
                </p>
              </div>

              <div
                className="flex-1 flex flex-col items-center py-3 rounded-xl"
                style={{
                  backgroundColor: hasHoursData ? `${CLOSED_COLOR}12` : (theme === 'dark' ? colors.surface : '#F5F5F5'),
                  border: `1px solid ${hasHoursData ? `${CLOSED_COLOR}30` : colors.cardBorder}`,
                }}
              >
                <div
                  className="w-2 h-2 rounded-full mb-1"
                  style={{ backgroundColor: hasHoursData ? CLOSED_COLOR : colors.textTertiary }}
                />
                <p className="text-2xl font-black" style={{ color: hasHoursData ? CLOSED_COLOR : colors.textTertiary }}>
                  {hasHoursData ? stats.closed : '—'}
                </p>
                <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: hasHoursData ? CLOSED_COLOR : colors.textTertiary }}>
                  Closed
                </p>
              </div>

              <div
                className="flex-1 flex flex-col items-center py-3 rounded-xl"
                style={{
                  backgroundColor: theme === 'dark' ? colors.surface : '#F5F5F5',
                  border: `1px solid ${colors.cardBorder}`,
                }}
              >
                <div
                  className="w-2 h-2 rounded-full mb-1"
                  style={{ backgroundColor: colors.textTertiary }}
                />
                <p className="text-2xl font-black" style={{ color: colors.textPrimary }}>
                  {stats.total}
                </p>
                <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: colors.textTertiary }}>
                  Days
                </p>
              </div>
            </div>

            {/* Selected Day Detail */}
            {selectedDayInfo && (
              <div
                className="p-4 rounded-xl mb-4 flex gap-4"
                style={{
                  backgroundColor: colors.surface,
                  border: `1px solid ${colors.cardBorder}`,
                }}
              >
                <div
                  className="w-16 h-16 rounded-xl flex flex-col items-center justify-center"
                  style={{
                    backgroundColor: selectedDayInfo.isOpen ? `${OPEN_COLOR}12` : `${CLOSED_COLOR}12`,
                  }}
                >
                  <p className="text-2xl font-black" style={{ color: selectedDayInfo.isOpen ? OPEN_COLOR : CLOSED_COLOR }}>
                    {selectedDay}
                  </p>
                  <p className="text-[10px] font-bold" style={{ color: selectedDayInfo.isOpen ? OPEN_COLOR : CLOSED_COLOR }}>
                    {selectedDayInfo.dayShort}
                  </p>
                </div>

                <div className="flex-1">
                  <p className="text-base font-black" style={{ color: colors.textPrimary }}>
                    {selectedDayInfo.dayName}
                  </p>
                  <p className="text-xs mb-2" style={{ color: colors.textTertiary }}>
                    {selectedDayInfo.date}
                  </p>
                  <div className="flex items-center gap-2 mb-1">
                    <div
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: selectedDayInfo.isOpen ? OPEN_COLOR : CLOSED_COLOR }}
                    />
                    <p className="text-xs font-bold" style={{ color: selectedDayInfo.isOpen ? OPEN_COLOR : CLOSED_COLOR }}>
                      {selectedDayInfo.isOpen ? 'Open' : 'Closed'}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock size={11} style={{ color: colors.textTertiary }} />
                    <p className="text-xs font-semibold" style={{ color: colors.textSecondary }}>
                      {selectedDayInfo.hours}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Calendar Card */}
            <div
              className="p-4 rounded-xl mb-4"
              style={{
                backgroundColor: colors.surface,
                border: `1px solid ${colors.cardBorder}`,
              }}
            >
              {/* Day Headers */}
              <div className="grid grid-cols-7 gap-2 mb-2">
                {WEEKDAYS.map((day, i) => (
                  <div key={day} className="text-center">
                    <p
                      className="text-xs font-bold uppercase tracking-wider"
                      style={{
                        color: (i === 0 || i === 6) ? colors.error : colors.textTertiary,
                      }}
                    >
                      {day}
                    </p>
                  </div>
                ))}
              </div>

              {/* Divider */}
              <div className="h-px mb-2" style={{ backgroundColor: colors.divider }} />

              {/* Calendar Grid */}
              <div className="grid grid-cols-7 gap-2">{renderCalendar()}</div>
            </div>

            {/* Weekly Hours */}
            {hasHoursData && (
              <div
                className="p-4 rounded-xl mb-4"
                style={{
                  backgroundColor: colors.surface,
                  border: `1px solid ${colors.cardBorder}`,
                }}
              >
                <h3 className="text-xs font-bold mb-3 uppercase tracking-wider" style={{ color: colors.textTertiary }}>
                  Weekly Hours
                </h3>
                {openingHours.map((dayHours, i) => {
                  const today = new Date();
                  const isToday2 = today.getDay() === i;
                  return (
                    <div
                      key={i}
                      className="flex items-center py-2 px-3 mb-1 rounded-lg"
                      style={{
                        backgroundColor: isToday2 ? `${colors.accent}10` : 'transparent',
                      }}
                    >
                      <div className="flex items-center gap-2 w-28">
                        <div
                          className="w-2 h-2 rounded-full"
                          style={{ backgroundColor: dayHours.isOpen ? OPEN_COLOR : CLOSED_COLOR }}
                        />
                        <p
                          className="text-sm font-semibold"
                          style={{ color: isToday2 ? colors.accent : colors.textPrimary }}
                        >
                          {dayHours.day}
                        </p>
                      </div>
                      <p
                        className="text-xs font-medium flex-1"
                        style={{ color: dayHours.isOpen ? colors.textSecondary : CLOSED_COLOR }}
                      >
                        {dayHours.hours}
                      </p>
                      {isToday2 && (
                        <div
                          className="px-2 py-1 rounded-md"
                          style={{ backgroundColor: colors.accent }}
                        >
                          <p className="text-[8px] font-bold text-white tracking-wider">TODAY</p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* Legend */}
            <div
              className="p-4 rounded-xl"
              style={{
                backgroundColor: colors.surface,
                border: `1px solid ${colors.cardBorder}`,
              }}
            >
              <h3 className="text-xs font-bold mb-3 uppercase tracking-wider" style={{ color: colors.textTertiary }}>
                Legend
              </h3>
              <div className="flex justify-between gap-4">
                <div className="flex items-center gap-2">
                  <div
                    className="w-7 h-7 rounded-lg flex items-center justify-center text-[8px] font-bold"
                    style={{
                      backgroundColor: `${OPEN_COLOR}15`,
                      color: OPEN_COLOR,
                    }}
                  >
                    OPEN
                  </div>
                  <p className="text-xs font-semibold" style={{ color: colors.textSecondary }}>
                    Open Day
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <div
                    className="w-7 h-7 rounded-lg flex items-center justify-center text-[8px] font-bold"
                    style={{
                      backgroundColor: `${CLOSED_COLOR}15`,
                      color: CLOSED_COLOR,
                    }}
                  >
                    OFF
                  </div>
                  <p className="text-xs font-semibold" style={{ color: colors.textSecondary }}>
                    Closed Day
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <div
                    className="w-7 h-7 rounded-lg flex items-center justify-center border-2"
                    style={{
                      borderColor: TODAY_RING,
                      backgroundColor: 'transparent',
                    }}
                  >
                    <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: TODAY_RING }} />
                  </div>
                  <p className="text-xs font-semibold" style={{ color: colors.textSecondary }}>
                    Today
                  </p>
                </div>
              </div>
            </div>
          </>
        )}

      </main>
    </div>
  );
}
