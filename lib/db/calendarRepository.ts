// Calendar/RDO repository functions
import { db } from './database';
import type { Squad, RdoSchedule } from '@/types';

export async function getAllSquads(): Promise<Squad[]> {
  return await db.squads.orderBy('displayOrder').toArray();
}

export async function getScheduleForSquad(squadId: number): Promise<RdoSchedule | undefined> {
  return await db.rdoSchedules.where('squadId').equals(squadId).first();
}

// RDO Calculation Engine
export function computeMonthSchedule(
  year: number,
  month: number, // 0-indexed (JS convention)
  schedule: RdoSchedule
): Record<number, boolean> {
  const result: Record<number, boolean> = {};
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const anchorDate = new Date(schedule.anchorDate + 'T00:00:00');

  for (let day = 1; day <= daysInMonth; day++) {
    const targetDate = new Date(year, month, day);
    const diffMs = targetDate.getTime() - anchorDate.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (schedule.patternType === 'rotating') {
      let dayIndex = ((diffDays + schedule.squadOffset) % schedule.cycleLength);
      if (dayIndex < 0) dayIndex += schedule.cycleLength;
      result[day] = schedule.patternArray[dayIndex] === 'O';
    } else {
      const dayOfWeek = targetDate.getDay();
      result[day] = schedule.patternArray[dayOfWeek] === 'O';
    }
  }

  return result;
}
