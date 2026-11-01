/* Everything on the share card is computed here, for both the in-app card and the PNG. No prompts or answers. */
import { CIRCUMFERENCE, dist, distancePhrase, shareText, type StopScore, type Tier } from '@/lib/scoring';
import type { Unit } from '@/lib/units';
import { shortDate } from '@/lib/time';

export type CardInput = { flight: number; date: string; stops: { tier: Tier | null; km: number; redEye: boolean }[] };

export function cardData(r: CardInput, domain = '', unit: Unit = 'km') {
  const scored: StopScore[] = r.stops.map((s) => ({ tier: s.tier ?? 'lost', km: s.km, redEye: s.redEye }));
  const total = scored.reduce((a, s) => a + s.km, 0);
  const redEyes = scored.filter((s) => s.redEye).length;
  const phrase = distancePhrase(total, scored);
  const line = [phrase === 'Circumnavigation' ? 'Circumnavigation · all 7 Uncharted' : phrase]
    .concat(redEyes ? [`${redEyes} Red-Eye${redEyes > 1 ? 's' : ''}`] : [])
    .join(' · ')
    .toUpperCase();
  return {
    flight: r.flight,
    date: shortDate(r.date),
    stops: scored.length,
    total,
    totalText: dist(total, unit),
    unitText: unit.toUpperCase(),
    circumferenceText: dist(CIRCUMFERENCE, unit),
    line,
    /** Plane position along the 0 → once-around-the-world route, 0–1. */
    progress: Math.min(1, total / CIRCUMFERENCE),
    squares: scored.map((s) => ({ tier: s.tier, redEye: s.redEye })),
    text: shareText(r.flight, scored, domain, unit),
  };
}
