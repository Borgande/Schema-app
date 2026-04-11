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

export interface AppConfig {
  /** ISO-datum för dag 1 (index 0) i cykeln för grupp 1 */
  cycleStartDate: string;
  /** Kända användare i appen */
  users: User[];
}

export interface SwapOption {
  partnerName: string;
  partnerGroup: GroupNumber;
  myShift: ShiftType;
  partnerShift: ShiftType;
  date: Date;
  valid: boolean;
  /** Om ogiltig, förklaring */
  reason?: string;
}

export interface NearbyShift {
  date: Date;
  type: ShiftType;
}
