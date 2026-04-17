import { BlockedDate, CoverOption, GroupNumber, NearbyShift, PaybackDay, ShiftType, SwapOption, User } from './types';
import { formatDate, getShiftEnd, getShiftForDate, getShiftStart } from './schedule';

const H = 60 * 60 * 1000; // 1 timme i ms

/**
 * Minsta vilatid (ms) som krävs efter ett visst skifttyp.
 *
 * Regler:
 *  - Efter Dag (17:30):  11h  (≥11h vila inom dygnet 20:00–20:00)
 *  - Efter Natt (08:00): 14,5h sammanhängande
 *  - Efter Dygn (08:00): 24h  sammanhängande
 *
 * Dygnsbryt är kl 20:00.
 */
export function requiredRestMs(prevShiftType: ShiftType, isDNPair = false): number {
  // D+N-undantag: N som direkt föregås av D samma dag kräver 24h vila (inte 14,5h)
  if (prevShiftType === 'N' && isDNPair) return 24 * H;
  switch (prevShiftType) {
    case 'N': return 14.5 * H;   // 14,5h efter nattpass
    case 'X': return 24   * H;   // 24h efter dygnpass
    case 'D': return 11   * H;   // 11h efter dagpass
    default:  return 0;
  }
}

/**
 * Kontrollerar om det finns tillräcklig vila mellan slutet av föregående pass
 * och starten av nästa, givet vilken typ det föregående passet var.
 */
export function hasEnoughRest(
  prevEnd: Date,
  nextStart: Date,
  prevShiftType: ShiftType,
  nextShiftType?: ShiftType,
): boolean {
  // D+N-undantag: D slutar 17:30, N börjar 17:30 samma dag → gap ≈ 0 ms → tillåtet
  if (prevShiftType === 'D' && nextShiftType === 'N') {
    const gap = nextStart.getTime() - prevEnd.getTime();
    if (gap >= -60_000 && gap <= 60_000) return true;
  }
  return nextStart.getTime() - prevEnd.getTime() >= requiredRestMs(prevShiftType);
}

/**
 * Returnerar en beskrivande text för vila-kravet efter ett pass.
 */
export function restLabel(shiftType: ShiftType, isDN = false): string {
  if (shiftType === 'N' && isDN) return '24h sammanhängande vila (D+N-undantag)';
  switch (shiftType) {
    case 'N': return '14,5h sammanhängande vila (efter nattpass)';
    case 'X': return '24h sammanhängande vila (efter dygnpass)';
    case 'D': return '11h vila (efter dagpass)';
    default:  return '';
  }
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
    if (prevEnd && !hasEnoughRest(prevEnd, newStartForA, userPrev.type, partnerShift)) {
      return {
        valid: false,
        reason: `Du har för lite vila efter ditt föregående pass (krav: ${restLabel(userPrev.type)}).`,
      };
    }
  }

  if (newEndForA && userNext) {
    const nextStart = getShiftStart(userNext.date, userNext.type);
    if (nextStart && !hasEnoughRest(newEndForA, nextStart, partnerShift)) {
      return {
        valid: false,
        reason: `Du har för lite vila efter det nya passet innan ditt nästkommande pass (krav: ${restLabel(partnerShift)}).`,
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
    if (prevEnd && !hasEnoughRest(prevEnd, newStartForB, partnerPrev.type, userShift)) {
      return {
        valid: false,
        reason: `Partnern har för lite vila efter sitt föregående pass (krav: ${restLabel(partnerPrev.type)}).`,
      };
    }
  }

  if (newEndForB && partnerNext) {
    const nextStart = getShiftStart(partnerNext.date, partnerNext.type);
    if (nextStart && !hasEnoughRest(newEndForB, nextStart, userShift)) {
      return {
        valid: false,
        reason: `Partnern har för lite vila efter det nya passet innan deras nästkommande pass (krav: ${restLabel(userShift)}).`,
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
  cycleStart: Date,
  blockedDates: BlockedDate[] = []
): SwapOption[] {
  const userShift = getShiftForDate(swapDate, user.group, cycleStart);

  // Kan bara byta om man själv arbetar
  if (userShift === 'L') return [];

  const options: SwapOption[] = [];

  for (const partner of allUsers) {
    // Hoppa över sig själv och sin egen grupp
    if (partner.name === user.name || partner.group === user.group) continue;

    // Hoppa över blockerade partners
    if (blockedDates.some(b => b.userName === partner.name && b.date === formatDate(swapDate))) continue;

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
  lookaheadDays = 56,
  blockedDates: BlockedDate[] = []
): CoverOption[] {
  const userShift = getShiftForDate(coverDate, user.group, cycleStart);

  // Användaren måste ha ett pass att täcka
  if (userShift === 'L') return [];

  const coverShiftStart = getShiftStart(coverDate, userShift);
  const coverShiftEnd = getShiftEnd(coverDate, userShift);

  const options: CoverOption[] = [];

  for (const candidate of allUsers) {
    if (candidate.name === user.name || candidate.group === user.group) continue;

    // Blockerad kandidat – kan inte täcka
    if (blockedDates.some(b => b.userName === candidate.name && b.date === formatDate(coverDate))) {
      options.push({ coverPerson: candidate, canCover: false, coverReason: 'Inte tillgänglig', paybackOptions: [], isDN: false });
      continue;
    }

    const candidateShiftOnCoverDay = getShiftForDate(coverDate, candidate.group, cycleStart);

    const isL = candidateShiftOnCoverDay === 'L';
    // D+N-undantag: kandidat har D och täcker N (jobbar D+N), eller har N och täcker D (D sedan N)
    const isDNcover =
      (candidateShiftOnCoverDay === 'D' && userShift === 'N') ||
      (candidateShiftOnCoverDay === 'N' && userShift === 'D');

    if (!isL && !isDNcover) continue;

    let canCover = true;
    let coverReason: string | undefined;

    if (isDNcover) {
      // D+N: hela kedjan startar med D (08:00) och slutar med N (08:00 nästa dag)
      const dnStart = getShiftStart(coverDate, 'D');  // 08:00
      const dnEnd   = getShiftEnd(coverDate, 'N');    // 08:00 nästa dag

      if (dnStart) {
        const candPrev = findPrevShift(coverDate, candidate.group, cycleStart);
        if (candPrev) {
          const prevEnd = getShiftEnd(candPrev.date, candPrev.type);
          if (prevEnd && !hasEnoughRest(prevEnd, dnStart, candPrev.type)) {
            canCover = false;
            coverReason = `För lite vila innan D+N-passet (krav: ${restLabel(candPrev.type)}).`;
          }
        }
      }

      if (canCover && dnEnd) {
        const candNext = findNextShift(coverDate, candidate.group, cycleStart);
        if (candNext) {
          const nextStart = getShiftStart(candNext.date, candNext.type);
          // Efter D+N krävs 24h vila (samma som efter dygnpass)
          if (nextStart && nextStart.getTime() - dnEnd.getTime() < 24 * H) {
            canCover = false;
            coverReason = `För lite vila efter D+N-passet (krav: 24h vila).`;
          }
        }
      }
    } else {
      // Normal L-kandidat: befintlig logik
      if (coverShiftStart) {
        const candPrev = findPrevShift(coverDate, candidate.group, cycleStart);
        if (candPrev) {
          const prevEnd = getShiftEnd(candPrev.date, candPrev.type);
          if (prevEnd && !hasEnoughRest(prevEnd, coverShiftStart, candPrev.type)) {
            canCover = false;
            coverReason = `För lite vila innan ditt pass (krav: ${restLabel(candPrev.type)}).`;
          }
        }
      }

      if (canCover && coverShiftEnd) {
        const candNext = findNextShift(coverDate, candidate.group, cycleStart);
        if (candNext) {
          const nextStart = getShiftStart(candNext.date, candNext.type);
          if (nextStart && !hasEnoughRest(coverShiftEnd, nextStart, userShift)) {
            canCover = false;
            coverReason = `För lite vila efter ditt pass (krav: ${restLabel(userShift)}).`;
          }
        }
      }
    }

    // Hitta möjliga återpass: dagar där kandidaten jobbar och användaren är ledig (eller D+N)
    const paybackOptions: PaybackDay[] = [];

    for (let offset = 1; offset <= lookaheadDays; offset++) {
      const day = new Date(coverDate);
      day.setDate(day.getDate() + offset);

      if (offset < PAYBACK_MIN_GAP_DAYS) continue;

      const userDayShift = getShiftForDate(day, user.group, cycleStart);
      const candidateDayShift = getShiftForDate(day, candidate.group, cycleStart);

      if (candidateDayShift === 'L') continue;

      // Hoppa över om användaren har blockerat denna dag som återpassdag
      if (blockedDates.some(b => b.userName === user.name && b.date === formatDate(day))) continue;

      // D+N-återpass: användaren har D och återpasset är N (eller vice versa)
      const isDNPayback =
        (userDayShift === 'D' && candidateDayShift === 'N') ||
        (userDayShift === 'N' && candidateDayShift === 'D');

      // Hoppa över om användaren jobbar och det inte är ett D+N-undantag
      if (userDayShift !== 'L' && !isDNPayback) continue;

      let valid = true;
      let reason: string | undefined;

      if (isDNPayback) {
        // D+N-återpass: kontrollera hela kedjan D 08:00 → N 08:00 nästa dag
        const dnStart = getShiftStart(day, 'D');
        const dnEnd   = getShiftEnd(day, 'N');

        if (dnStart) {
          const userPrev = findPrevShift(day, user.group, cycleStart);
          if (userPrev) {
            const prevEnd = getShiftEnd(userPrev.date, userPrev.type);
            if (prevEnd && !hasEnoughRest(prevEnd, dnStart, userPrev.type)) {
              valid = false;
              reason = `För lite vila innan D+N-återpasset (krav: ${restLabel(userPrev.type)}).`;
            }
          }
        }

        if (valid && dnEnd) {
          const userNext = findNextShift(day, user.group, cycleStart);
          if (userNext) {
            const nextStart = getShiftStart(userNext.date, userNext.type);
            if (nextStart && nextStart.getTime() - dnEnd.getTime() < 24 * H) {
              valid = false;
              reason = `För lite vila efter D+N-återpasset (krav: 24h vila).`;
            }
          }
        }

        paybackOptions.push({ date: day, shiftType: candidateDayShift, valid, reason, isDN: true });
      } else {
        // Normalt återpass (användaren är ledig)
        const paybackStart = getShiftStart(day, candidateDayShift);
        const paybackEnd = getShiftEnd(day, candidateDayShift);

        if (paybackStart) {
          const userPrev = findPrevShift(day, user.group, cycleStart);
          if (userPrev) {
            const prevEnd = getShiftEnd(userPrev.date, userPrev.type);
            if (prevEnd && !hasEnoughRest(prevEnd, paybackStart, userPrev.type)) {
              valid = false;
              reason = `För lite vila innan återpasset (krav: ${restLabel(userPrev.type)}).`;
            }
          }
        }

        if (valid && paybackEnd) {
          const userNext = findNextShift(day, user.group, cycleStart);
          if (userNext) {
            const nextStart = getShiftStart(userNext.date, userNext.type);
            if (nextStart && !hasEnoughRest(paybackEnd, nextStart, candidateDayShift)) {
              valid = false;
              reason = `För lite vila efter återpasset (krav: ${restLabel(candidateDayShift)}).`;
            }
          }
        }

        paybackOptions.push({ date: day, shiftType: candidateDayShift, valid, reason });
      }
    }

    options.push({ coverPerson: candidate, canCover, coverReason, paybackOptions, isDN: isDNcover });
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
