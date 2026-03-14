/**
 * RDO Rotation Engine — matches rdocalendar.com exactly.
 *
 * 15-day repeating cycle (Patrol):
 *   S2(2), S1(3), S3(2), S2(3), S1(2), S3(3)
 *
 * Epoch (day 0 of cycle): 2025-12-31   (a Wednesday)
 *   – that day is the first of the S2 two-day block.
 *
 * Paydays: every other Friday.  2026-01-02 is a known payday Friday,
 *   so any Friday whose week-offset from that anchor is even is a payday.
 *
 * Holidays: explicit list for 2025-2028.
 */

// ─── cycle definition ──────────────────────────────────────────────
const CYCLE_LENGTH = 15;

// Each entry: [squad, blockLength]
const CYCLE_BLOCKS: [number, number][] = [
  [2, 2],
  [1, 3],
  [3, 2],
  [2, 3],
  [1, 2],
  [3, 3],
];

// Pre-expand to a 15-element lookup: index → squad (1|2|3)
const CYCLE_SQUADS: number[] = [];
for (const [squad, len] of CYCLE_BLOCKS) {
  for (let i = 0; i < len; i++) CYCLE_SQUADS.push(squad);
}
// CYCLE_SQUADS = [2,2, 1,1,1, 3,3, 2,2,2, 1,1, 3,3,3]

// Epoch: 2025-12-31 (UTC midnight)
const EPOCH = Date.UTC(2025, 11, 31); // months are 0-indexed
const MS_PER_DAY = 86_400_000;

// Payday anchor: 2026-01-02 is a Friday payday
const PAYDAY_ANCHOR = Date.UTC(2026, 0, 2);
const PAYDAY_INTERVAL_MS = 14 * MS_PER_DAY;

// ─── public helpers ─────────────────────────────────────────────────

export function getSquadForDate(year: number, month: number, day: number): number {
  const d = Date.UTC(year, month, day);
  let offset = Math.round((d - EPOCH) / MS_PER_DAY);
  offset = ((offset % CYCLE_LENGTH) + CYCLE_LENGTH) % CYCLE_LENGTH;
  return CYCLE_SQUADS[offset];
}

export function isPayday(year: number, month: number, day: number): boolean {
  const d = Date.UTC(year, month, day);
  const dow = new Date(d).getUTCDay(); // 0=Sun … 5=Fri
  if (dow !== 5) return false;
  const diff = Math.round((d - PAYDAY_ANCHOR) / MS_PER_DAY);
  return diff % 14 === 0;
}

export interface HolidayInfo {
  name: string;
}

const HOLIDAYS: Record<string, string> = {
  // 2025
  '2025-12-24': 'Christmas Eve',
  '2025-12-25': 'Christmas Day',
  '2025-12-31': "New Year's Eve",
  // 2026
  '2026-01-01': "New Year's Day",
  '2026-01-19': 'Martin Luther King Jr. Day',
  '2026-02-14': "Valentine's Day",
  '2026-02-16': "Washington's Birthday",
  '2026-04-05': 'Easter Sunday',
  '2026-04-15': 'Tax Day',
  '2026-04-22': 'Administrative Professionals Day',
  '2026-05-10': "Mother's Day",
  '2026-05-25': 'Memorial Day',
  '2026-06-21': "Father's Day",
  '2026-07-03': 'Independence Day (observed)',
  '2026-07-04': 'Independence Day',
  '2026-09-07': 'Labor Day',
  '2026-10-12': 'Columbus Day',
  '2026-10-31': 'Halloween',
  '2026-11-11': 'Veterans Day',
  '2026-11-26': 'Thanksgiving Day',
  '2026-11-27': 'Day after Thanksgiving',
  '2026-12-24': 'Christmas Eve',
  '2026-12-25': 'Christmas Day',
  '2026-12-31': "New Year's Eve",
  // 2027
  '2027-01-01': "New Year's Day",
  '2027-01-18': 'Martin Luther King Jr. Day',
  '2027-02-15': "Washington's Birthday",
  '2027-03-28': 'Easter Sunday',
  '2027-05-09': "Mother's Day",
  '2027-05-31': 'Memorial Day',
  '2027-06-20': "Father's Day",
  '2027-07-04': 'Independence Day',
  '2027-07-05': 'Independence Day (observed)',
  '2027-09-06': 'Labor Day',
  '2027-10-11': 'Columbus Day',
  '2027-10-31': 'Halloween',
  '2027-11-11': 'Veterans Day',
  '2027-11-25': 'Thanksgiving Day',
  '2027-11-26': 'Day after Thanksgiving',
  '2027-12-24': 'Christmas Eve',
  '2027-12-25': 'Christmas Day',
  '2027-12-31': "New Year's Eve",
  // 2028
  '2028-01-01': "New Year's Day",
  '2028-01-17': 'Martin Luther King Jr. Day',
  '2028-02-21': "Washington's Birthday",
  '2028-04-16': 'Easter Sunday',
  '2028-05-14': "Mother's Day",
  '2028-05-29': 'Memorial Day',
  '2028-06-18': "Father's Day",
  '2028-07-04': 'Independence Day',
  '2028-09-04': 'Labor Day',
  '2028-10-09': 'Columbus Day',
  '2028-10-31': 'Halloween',
  '2028-11-10': 'Veterans Day (observed)',
  '2028-11-11': 'Veterans Day',
  '2028-11-23': 'Thanksgiving Day',
  '2028-11-24': 'Day after Thanksgiving',
  '2028-12-24': 'Christmas Eve',
  '2028-12-25': 'Christmas Day',
  '2028-12-31': "New Year's Eve",
};

export function getHolidayName(year: number, month: number, day: number): string | null {
  const key = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  return HOLIDAYS[key] ?? null;
}

export function getHolidaysInMonth(year: number, month: number): { day: number; name: string }[] {
  const prefix = `${year}-${String(month + 1).padStart(2, '0')}-`;
  const result: { day: number; name: string }[] = [];
  for (const [key, name] of Object.entries(HOLIDAYS)) {
    if (key.startsWith(prefix)) {
      result.push({ day: parseInt(key.slice(8), 10), name });
    }
  }
  return result.sort((a, b) => a.day - b.day);
}

export interface DayInfo {
  squad: number;
  isPayday: boolean;
  holidayName: string | null;
}

export function getDayInfo(year: number, month: number, day: number): DayInfo {
  return {
    squad: getSquadForDate(year, month, day),
    isPayday: isPayday(year, month, day),
    holidayName: getHolidayName(year, month, day),
  };
}

/**
 * For a given squad, find the next RDO stretch starting from (and including) a date.
 * Returns { start: Date, end: Date, length: number } or null.
 */
export function getNextRdoStretch(
  squad: number,
  fromYear: number,
  fromMonth: number,
  fromDay: number,
): { startDate: string; endDate: string; length: number; daysUntil: number } | null {
  const from = Date.UTC(fromYear, fromMonth, fromDay);

  for (let offset = 0; offset < 60; offset++) {
    const d = new Date(from + offset * MS_PER_DAY);
    const y = d.getUTCFullYear();
    const m = d.getUTCMonth();
    const day = d.getUTCDate();
    const s = getSquadForDate(y, m, day);

    if (s === squad) {
      const startDate = fmtDate(y, m, day);
      let length = 1;
      while (length < 10) {
        const nd = new Date(from + (offset + length) * MS_PER_DAY);
        if (getSquadForDate(nd.getUTCFullYear(), nd.getUTCMonth(), nd.getUTCDate()) !== squad) break;
        length++;
      }
      const endD = new Date(from + (offset + length - 1) * MS_PER_DAY);
      return {
        startDate,
        endDate: fmtDate(endD.getUTCFullYear(), endD.getUTCMonth(), endD.getUTCDate()),
        length,
        daysUntil: offset,
      };
    }
  }
  return null;
}

function fmtDate(y: number, m: number, d: number): string {
  return `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

/**
 * Check whether a date is a workday or RDO for a given squad.
 * On rdocalendar.com "Squad X" on a date means that squad is OFF (RDO).
 */
export function isRdoForSquad(squad: number, year: number, month: number, day: number): boolean {
  return getSquadForDate(year, month, day) === squad;
}
