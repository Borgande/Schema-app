import { GroupNumber, NearbyShift, ShiftType, SwapOption, User } from './types';
import { getShiftEnd, getShiftForDate, getShiftStart } from './schedule';

const REST_MS = 11 * 60 * 60 * 1000; // 11 timmar i millisekunder

/**
 * Kontrollerar om det finns tillräcklig vila (≥11h) mellan två tidpunkter.
 */
export function hasEnoughRest(prevEnd: Date, nextStart: Date): boolean {
  return nextStart.getTime() - prevEnd.getTime() >= REST_MS;
}

/**
 * Söker bakåt i schemat och returnerar närmaste föregående arbetspass (icke-L).
 * Börjar söka från dagen FÖRE det angivna datumet.
 */
export function findPrevShift(
  date: Date,
  group: GroupNumber,
  cycleStart: Date,
  maxDays = 14
): NearbyShift | null {
  for (let i = 1; i <= maxDays; i++) {
    const d = new Date(date);
    d.setDate(d.getDate() - i);
    const type = getShiftForDate(d, group, cycleStart);
    if (type !== 'L') {
      return { date: d, type };
    }
  }
  return null;
}

/**
 * Söker framåt i schemat och returnerar närmaste kommande arbetspass (icke-L).
 * Börjar söka från dagen EFTER det angivna datumet.
 */
export function findNextShift(
  date: Date,
  group: GroupNumber,
  cycleStart: Date,
  maxDays = 14
): NearbyShift | null {
  for (let i = 1; i <= maxDays; i++) {
    const d = new Date(date);
    d.setDate(d.getDate() + i);
    const type = getShiftForDate(d, group, cycleStart);
    if (type !== 'L') {
      return { date: d, type };
    }
  }
  return null;
}

/**
 * Kontrollerar om ett byte av pass är tillåtet (11h-regeln måste uppfyllas för båda parter).
 *
 * Scenario: Användare A (grupp userGroup) arbetar userShift på swapDate.
 *           Partner B (grupp partnerGroup) arbetar partnerShift på swapDate.
 *           Efter bytet: A tar partnerShift, B tar userShift.
 */
export function checkSwapCompatibility(
  swapDate: Date,
  userGroup: GroupNumber,
  userShift: ShiftType,
  partnerGroup: GroupNumber,
  partnerShift: ShiftType,
  cycleStart: Date
): { valid: boolean; reason?: string } {
  // Kontrollera för Användare A (tar partnerShift)
  const userPrev = findPrevShift(swapDate, userGroup, cycleStart);
  const userNext = findNextShift(swapDate, userGroup, cycleStart);

  const newStartForA = getShiftStart(swapDate, partnerShift);
  const newEndForA = getShiftEnd(swapDate, partnerShift);

  if (newStartForA && userPrev) {
    const prevEnd = getShiftEnd(userPrev.date, userPrev.type);
    if (prevEnd && !hasEnoughRest(prevEnd, newStartForA)) {
      return {
        valid: false,
        reason: `Du har för lite vila (< 11h) mellan ditt föregående pass och det nya passet.`,
      };
    }
  }

  if (newEndForA && userNext) {
    const nextStart = getShiftStart(userNext.date, userNext.type);
    if (nextStart && !hasEnoughRest(newEndForA, nextStart)) {
      return {
        valid: false,
        reason: `Du har för lite vila (< 11h) mellan det nya passet och ditt nästkommande pass.`,
      };
    }
  }

  // Kontrollera för Partner B (tar userShift)
  const partnerPrev = findPrevShift(swapDate, partnerGroup, cycleStart);
  const partnerNext = findNextShift(swapDate, partnerGroup, cycleStart);

  const newStartForB = getShiftStart(swapDate, userShift);
  const newEndForB = getShiftEnd(swapDate, userShift);

  if (newStartForB && partnerPrev) {
    const prevEnd = getShiftEnd(partnerPrev.date, partnerPrev.type);
    if (prevEnd && !hasEnoughRest(prevEnd, newStartForB)) {
      return {
        valid: false,
        reason: `Partnern har för lite vila (< 11h) mellan deras föregående pass och det nya passet.`,
      };
    }
  }

  if (newEndForB && partnerNext) {
    const nextStart = getShiftStart(partnerNext.date, partnerNext.type);
    if (nextStart && !hasEnoughRest(newEndForB, nextStart)) {
      return {
        valid: false,
        reason: `Partnern har för lite vila (< 11h) mellan det nya passet och deras nästkommande pass.`,
      };
    }
  }

  return { valid: true };
}

/**
 * Hittar alla möjliga bytespartners för ett visst datum och en användare.
 * Returnerar bara personer från andra grupper som också arbetar den dagen.
 */
export function findSwapOptions(
  swapDate: Date,
  user: User,
  allUsers: User[],
  cycleStart: Date
): SwapOption[] {
  const userShift = getShiftForDate(swapDate, user.group, cycleStart);

  // Kan bara byta om man själv arbetar
  if (userShift === 'L') return [];

  const options: SwapOption[] = [];

  for (const partner of allUsers) {
    // Hoppa över sig själv och sin egen grupp
    if (partner.name === user.name || partner.group === user.group) continue;

    const partnerShift = getShiftForDate(swapDate, partner.group, cycleStart);

    // Partnern måste också arbeta
    if (partnerShift === 'L') continue;

    const result = checkSwapCompatibility(
      swapDate,
      user.group,
      userShift,
      partner.group,
      partnerShift,
      cycleStart
    );

    options.push({
      partnerName: partner.name,
      partnerGroup: partner.group,
      myShift: userShift,
      partnerShift,
      date: swapDate,
      valid: result.valid,
      reason: result.reason,
    });
  }

  // Sortera: giltiga byten först
  options.sort((a, b) => {
    if (a.valid && !b.valid) return -1;
    if (!a.valid && b.valid) return 1;
    return a.partnerName.localeCompare(b.partnerName);
  });

  return options;
}
