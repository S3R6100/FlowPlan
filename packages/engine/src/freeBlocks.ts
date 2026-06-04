import type { FreeBlockDto } from '@flowplan/shared';

export interface EventInterval {
  startHour: number;
  endHour: number;
  status: string;
  type?: string;
}

const MIN_BLOCK_HOURS = 0.25; // 15 minutes

/**
 * Solo los eventos **fijos** activos ocupan el horario.
 * Los eventos dinámicos (sesiones con podómetro) no reducen huecos libres.
 */
export function computeFreeBlocks(
  events: EventInterval[],
  dayStart = 0,
  dayEnd = 24
): FreeBlockDto[] {
  const occupied = events
    .filter((e) => e.status === 'active' && (e.type ?? 'fixed') === 'fixed')
    .map((e) => ({
      start: Math.max(dayStart, e.startHour),
      end: Math.min(dayEnd, e.endHour),
    }))
    .filter((e) => e.end > e.start)
    .sort((a, b) => a.start - b.start);

  const merged: { start: number; end: number }[] = [];
  for (const interval of occupied) {
    const last = merged[merged.length - 1];
    if (!last || interval.start > last.end) {
      merged.push({ ...interval });
    } else {
      last.end = Math.max(last.end, interval.end);
    }
  }

  const free: FreeBlockDto[] = [];
  let cursor = dayStart;

  for (const block of merged) {
    if (block.start > cursor) {
      free.push({ startHour: cursor, endHour: block.start });
    }
    cursor = Math.max(cursor, block.end);
  }

  if (cursor < dayEnd) {
    free.push({ startHour: cursor, endHour: dayEnd });
  }

  return free.filter((b) => b.endHour - b.startHour >= MIN_BLOCK_HOURS);
}
