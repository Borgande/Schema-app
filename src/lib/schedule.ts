import { GroupNumber, ScheduledDay, ShiftInfo, ShiftType } from './types';

/**
 * 28-dagars rotationsmönster för grupp 1.
 * Index 0 = dag 1 i cykeln.
 * Schemaordning: 1 → 3 → 2 → 4 (varje grupp startar sin cykel 7 dagar senare)
 */
export const BASE_PATTERN: ShiftType[] = [
  'N','L','L','D','N','L','X','L','L','D',
  'N','L','L','L','D','N','L','L','D','X',
  'L','L','D','N','L','L','L','L'
];

/**
 * Offsets (dagar in i cykeln) per grupp.
 * Grupp 1 startar på dag 0, grupp 3 på dag 7, grupp 2 på dag 14, grupp 4 på dag 21.
 * Schemaordning: 1 → 3 → 2 → 4
 */
export const GROUP_OFFSETS: Record<GroupNumber, number> = {
  1: 0,
  3: 7,
  2: 14,
  4: 21,
};

/** Detaljerad info per skifttyp */
export const SHIFT_INFO: Record<ShiftType, ShiftInfo> = {
  D: {
    type: 'D',
    label: 'Dag',
    startHour: 8, startMin: 0,
    endHour: 17, endMin: 30,
    spansNextDay: false,
    duration: '08:00–17:30',
  },
  N: {
    type: 'N',
    label: 'Natt',
    startHour: 17, startMin: 30,
    endHour: 8, endMin: 0,
    spansNextDay: true,
    duration: '17:30–08:00',
  },
  X: {
    type: 'X',
    label: 'Dygn',
    startHour: 8, startMin: 0,
    endHour: 8, endMin: 0,
    spansNextDay: true,
    duration: '08:00–08:00',
  },
  L: {
    type: 'L',
    label: 'Ledig',
    startHour: 0, startMin: 0,
    endHour: 0, endMin: 0,
    spansNextDay: false,
    duration: '–',
  },
};

/** Beräknar antal hela dagar mellan två datum (avrundat nedåt) */
function daysBetween(a: Date, b: Date): number {
  const msPerDay = 24 * 60 * 60 * 1000;
  const utcA = Date.UTC(a.getFullYear(), a.getMonth(), a.getDate());
  const utcB = Date.UTC(b.getFullYear(), b.getMonth(), b.getDate());
  return Math.floor((utcB - utcA) / msPerDay);
}

/**
 * Returnerar skifttyp för en grupp på ett visst datum.
 * Verifiering: Dag 8 (dayIndex=7), Grupp 3 → (7 - 7 + 28) % 28 = 0 → N ✓
 *              Dag 1 (dayIndex=0), Grupp 1 → (0 - 0 + 28) % 28 = 0 → N ✓
 *              Dag 15 (dayIndex=14), Grupp 2 → (14 - 14 + 28) % 28 = 0 → N ✓
 */
export function getShiftForDate(date: Date, group: GroupNumber, cycleStart: Date): ShiftType {
  const dayIndex = daysBetween(cycleStart, date);
  const cycleDay = ((dayIndex - GROUP_OFFSETS[group]) % 28 + 28) % 28;
  return BASE_PATTERN[cycleDay];
}

/** Returnerar alla 4 gruppers skift för ett datum */
export function getDaySchedule(date: Date, cycleStart: Date): ScheduledDay {
  return {
    date,
    shifts: {
      1: getShiftForDate(date, 1, cycleStart),
      2: getShiftForDate(date, 2, cycleStart),
      3: getShiftForDate(date, 3, cycleStart),
      4: getShiftForDate(date, 4, cycleStart),
    },
  };
}

/** Returnerar schema för N dagar framåt från startDate (inklusivt) */
export function getScheduleRange(startDate: Date, days: number, cycleStart: Date): ScheduledDay[] {
  const result: ScheduledDay[] = [];
  for (let i = 0; i < days; i++) {
    const d = new Date(startDate);
    d.setDate(d.getDate() + i);
    result.push(getDaySchedule(d, cycleStart));
  }
  return result;
}

/**
 * Returnerar starttiden för ett skift som ett Date-objekt.
 * Returnerar null för lediga dagar.
 */
export function getShiftStart(date: Date, type: ShiftType): Date | null {
  if (type === 'L') return null;
  const info = SHIFT_INFO[type];
  const d = new Date(date);
  d.setHours(info.startHour, info.startMin, 0, 0);
  return d;
}

/**
 * Returnerar sluttiden för ett skift som ett Date-objekt.
 * För N och X (spansNextDay=true) är sluttiden nästa dag.
 * Returnerar null för lediga dagar.
 */
export function getShiftEnd(date: Date, type: ShiftType): Date | null {
  if (type === 'L') return null;
  const info = SHIFT_INFO[type];
  const d = new Date(date);
  if (info.spansNextDay) {
    d.setDate(d.getDate() + 1);
  }
  d.setHours(info.endHour, info.endMin, 0, 0);
  return d;
}

/** Formaterar ett datum som YYYY-MM-DD */
export function formatDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/** Parsar ett ISO-datum (YYYY-MM-DD) till ett Date-objekt (lokal tid) */
export function parseDate(dateStr: string): Date {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d);
}

/** Returnerar en läsbar datumformatering på svenska */
export function formatSwedishDate(date: Date): string {
  const days = ['Sön', 'Mån', 'Tis', 'Ons', 'Tor', 'Fre', 'Lör'];
  const months = ['jan', 'feb', 'mar', 'apr', 'maj', 'jun', 'jul', 'aug', 'sep', 'okt', 'nov', 'dec'];
  return `${days[date.getDay()]} ${date.getDate()} ${months[date.getMonth()]}`;
}

/** Returnerar veckodagsnamnet på svenska */
export function getSwedishWeekday(date: Date): string {
  const days = ['Söndag', 'Måndag', 'Tisdag', 'Onsdag', 'Torsdag', 'Fredag', 'Lördag'];
  return days[date.getDay()];
}

/** Kontrollerar om ett datum är lördag eller söndag */
export function isWeekend(date: Date): boolean {
  const day = date.getDay();
  return day === 0 || day === 6;
}
