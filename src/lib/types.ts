export type ShiftType = 'D' | 'N' | 'X' | 'L';
export type GroupNumber = 1 | 2 | 3 | 4;

export interface ShiftInfo {
  type: ShiftType;
  label: string;
  startHour: number;
  startMin: number;
  endHour: number;
  endMin: number;
  /** true om slutet är nästa dag (N och X) */
  spansNextDay: boolean;
  /** Durationbeskrivning */
  duration: string;
}

export interface ScheduledDay {
  date: Date;
  shifts: Record<GroupNumber, ShiftType>;
}

export interface User {
  name: string;
  group: GroupNumber;
}

export interface BlockedPeriod {
  userName: string;
  from: string; // YYYY-MM-DD
  to: string;   // YYYY-MM-DD
}

export interface SwapRecord {
  date: string; // YYYY-MM-DD
  group: GroupNumber;
  newShift: ShiftType;
  partnerName: string;
}

export interface AppConfig {
  /** ISO-datum för dag 1 (index 0) i cykeln för grupp 1 */
  cycleStartDate: string;
  /** Kända användare i appen */
  users: User[];
  blockedPeriods?: BlockedPeriod[];
  swapRecords?: SwapRecord[];
}

export interface SwapOption {
  partnerName: string;
  partnerGroup: GroupNumber;
  myShift: ShiftType;
  partnerShift: ShiftType;
  date: Date;         // User's shift date (the date they want off)
  partnerDate: Date;  // Partner's shift date (same or ±1 day)
  dayOffset: number;  // 0, -1, or +1
  valid: boolean;
  /** Om ogiltig, förklaring */
  reason?: string;
}

export interface NearbyShift {
  date: Date;
  type: ShiftType;
}

/** Ett möjligt återpass (användaren jobbar tillbaka för den täckande personen) */
export interface PaybackDay {
  date: Date;
  shiftType: ShiftType;
  valid: boolean;
  /** Om ogiltigt, förklaring */
  reason?: string;
  /** Är detta ett D+N-undantagspass (dagpass + nattpass samma kalenderdag)? */
  isDN?: boolean;
}

/** En person som potentiellt kan täcka ett pass, med tillhörande återpassalternativ */
export interface CoverOption {
  coverPerson: User;
  /** Kan personen fysiskt täcka passet (11h-regeln OK)? */
  canCover: boolean;
  /** Om canCover=false, varför */
  coverReason?: string;
  /** Dagar där användaren kan jobba tillbaka för den täckande personen */
  paybackOptions: PaybackDay[];
  /** Täcks via D+N-undantaget (kandidaten har D/N och täcker det motsatta passet samma dag)? */
  isDN?: boolean;
}
