import { CoverOption, GroupNumber, NearbyShift, PaybackDay, ShiftType, SwapOption, User } from './types';
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

/**
 * Minsta antal dagar mellan täckningsdatumet och ett återpass.
 * Säkerställer att återpasset inte har "anslutning" till det ursprungliga datumet.
 */
const PAYBACK_MIN_GAP_DAYS = 4;

/**
 * Hittar personer som kan täcka ett pass (de är lediga den dagen) och
 * returnerar för varje person en lista med möjliga återpass
 * (dagar då de jobbar och användaren är ledig, med godkänd 11h-vila).
 *
 * Återpassdagen måste vara minst PAYBACK_MIN_GAP_DAYS dagar från täckningsdagen
 * för att undvika "anslutning" till det ursprungliga datumet.
 */
export function findCoverOptions(
  coverDate: Date,
  user: User,
  allUsers: User[],
  cycleStart: Date,
  lookaheadDays = 56
): CoverOption[] {
  const userShift = getShiftForDate(coverDate, user.group, cycleStart);

  // Användaren måste ha ett pass att täcka
  if (userShift === 'L') return [];

  const coverShiftStart = getShiftStart(coverDate, userShift);
  const coverShiftEnd = getShiftEnd(coverDate, userShift);

  const options: CoverOption[] = [];

  for (const candidate of allUsers) {
    if (candidate.name === user.name || candidate.group === user.group) continue;

    const candidateShiftOnCoverDay = getShiftForDate(coverDate, candidate.group, cycleStart);

    // Kandidaten måste vara LEDIG den dagen för att kunna täcka
    if (candidateShiftOnCoverDay !== 'L') continue;

    // Kontrollera om kandidaten klarar 11h-regeln för att täcka passet
    let canCover = true;
    let coverReason: string | undefined;

    if (coverShiftStart) {
      const candPrev = findPrevShift(coverDate, candidate.group, cycleStart);
      if (candPrev) {
        const prevEnd = getShiftEnd(candPrev.date, candPrev.type);
        if (prevEnd && !hasEnoughRest(prevEnd, coverShiftStart)) {
          canCover = false;
          coverReason = 'För lite vila (< 11h) innan ditt pass.';
        }
      }
    }

    if (canCover && coverShiftEnd) {
      const candNext = findNextShift(coverDate, candidate.group, cycleStart);
      if (candNext) {
        const nextStart = getShiftStart(candNext.date, candNext.type);
        if (nextStart && !hasEnoughRest(coverShiftEnd, nextStart)) {
          canCover = false;
          coverReason = 'För lite vila (< 11h) efter ditt pass.';
        }
      }
    }

    // Hitta möjliga återpass: dagar där kandidaten jobbar och användaren är ledig
    const paybackOptions: PaybackDay[] = [];

    for (let offset = 1; offset <= lookaheadDays; offset++) {
      const day = new Date(coverDate);
      day.setDate(day.getDate() + offset);

      // Måste ha tillräckligt avstånd från täckningsdagen
      if (offset < PAYBACK_MIN_GAP_DAYS) continue;

      const userDayShift = getShiftForDate(day, user.group, cycleStart);
      const candidateDayShift = getShiftForDate(day, candidate.group, cycleStart);

      // Användaren måste vara ledig, kandidaten måste jobba
      if (userDayShift !== 'L' || candidateDayShift === 'L') continue;

      // Kontrollera 11h-regeln för användaren som jobbar återpasset
      let valid = true;
      let reason: string | undefined;

      const paybackStart = getShiftStart(day, candidateDayShift);
      const paybackEnd = getShiftEnd(day, candidateDayShift);

      if (paybackStart) {
        const userPrev = findPrevShift(day, user.group, cycleStart);
        if (userPrev) {
          const prevEnd = getShiftEnd(userPrev.date, userPrev.type);
          if (prevEnd && !hasEnoughRest(prevEnd, paybackStart)) {
            valid = false;
            reason = 'Du har för lite vila (< 11h) innan återpasset.';
          }
        }
      }

      if (valid && paybackEnd) {
        const userNext = findNextShift(day, user.group, cycleStart);
        if (userNext) {
          const nextStart = getShiftStart(userNext.date, userNext.type);
          if (nextStart && !hasEnoughRest(paybackEnd, nextStart)) {
            valid = false;
            reason = 'Du har för lite vila (< 11h) efter återpasset.';
          }
        }
      }

      paybackOptions.push({ date: day, shiftType: candidateDayShift, valid, reason });
    }

    options.push({ coverPerson: candidate, canCover, coverReason, paybackOptions });
  }

  // Sortera: kan täcka + har giltiga återpass först
  options.sort((a, b) => {
    const aScore = (a.canCover ? 2 : 0) + (a.paybackOptions.some(p => p.valid) ? 1 : 0);
    const bScore = (b.canCover ? 2 : 0) + (b.paybackOptions.some(p => p.valid) ? 1 : 0);
    if (aScore !== bScore) return bScore - aScore;
    return a.coverPerson.name.localeCompare(b.coverPerson.name);
  });

  return options;
}
