/* Scoring — ported from design/components/bundle.js (kmFor, tierFor) plus the timing rules in BUILD_SPEC.
   Each answer's km and tier come from its fixed rarity (see rarityFor); the live crowd is display-only.
   The Postgres functions in supabase/migrations mirror kmFor/tierFor; keep the two in sync. */
import { toUnit, type Unit } from '@/lib/units';

export const MAX_STOP = 5725;
export const CIRCUMFERENCE = 40075;
export const STOPS_PER_FLIGHT = 7;

export const GATE_MS = 20_000;
export const GRACE_MS = 1_500;
export const RED_EYE_MS = 3_000;
/** Crowd stats stay hidden until this many players have answered a stop. */
export const CROWD_MIN = 20;

export type Tier = 'tourist' | 'backpacker' | 'explorer' | 'uncharted' | 'lost';

export const TIERS: Record<Tier, { name: string; cls: string; emoji: string }> = {
  tourist: { name: 'Tourist', cls: 't-tourist', emoji: '⬜' },
  backpacker: { name: 'Backpacker', cls: 't-backpacker', emoji: '🟩' },
  explorer: { name: 'Explorer', cls: 't-explorer', emoji: '🟦' },
  uncharted: { name: 'Uncharted', cls: 't-uncharted', emoji: '🟪' },
  lost: { name: 'Lost Luggage', cls: 't-lost', emoji: '⬛' },
};
/** Red-Eye is a badge, not a tier: correct answer with 3 seconds or less left. No km. */
export const REDEYE = { name: 'Red-Eye', cls: 't-redeye', emoji: '⏰' };

/** km = round(min(5725, 5725 × ln(1/rarity) / ln(100))) */
export function kmFor(rarity: number): number {
  if (!(rarity > 0)) return MAX_STOP;
  return Math.round(Math.min(MAX_STOP, Math.max(0, (MAX_STOP * Math.log(1 / rarity)) / Math.log(100))));
}

export function tierFor(rarity: number): Exclude<Tier, 'lost'> {
  return rarity >= 0.25 ? 'tourist' : rarity >= 0.1 ? 'backpacker' : rarity >= 0.03 ? 'explorer' : 'uncharted';
}

/** Real crowd share (count ÷ correct answers), or null while fewer than CROWD_MIN players have answered the stop. */
export function crowdShare(count: number, correct: number, answered: number): number | null {
  if (answered < CROWD_MIN) return null;
  return correct > 0 ? count / correct : 0;
}

export type Timing = { elapsedMs: number; leftMs: number; late: boolean; redEyeWindow: boolean };

/** Judge a submission by the server's clock. Late = after 20 s + 1.5 s grace. Red-Eye window = 3.0 s or less left. */
export function judgeTiming(servedAt: number, answeredAt: number): Timing {
  const elapsedMs = Math.max(0, answeredAt - servedAt);
  const leftMs = GATE_MS - elapsedMs;
  return { elapsedMs, leftMs, late: elapsedMs > GATE_MS + GRACE_MS, redEyeWindow: leftMs <= RED_EYE_MS };
}

export type StopScore = { tier: Tier; km: number; redEye: boolean };

export function distancePhrase(totalKm: number, stops: StopScore[]): string {
  if (stops.length === STOPS_PER_FLIGHT && stops.every((s) => s.tier === 'uncharted')) return 'Circumnavigation';
  if (totalKm >= 20_000) return 'The other side of the world';
  if (totalKm >= 5_000) return 'Across an ocean';
  if (totalKm >= 1_000) return 'Across the border';
  return 'Still on the runway';
}

export function isCircumnavigation(stops: StopScore[]): boolean {
  return stops.length === STOPS_PER_FLIGHT && stops.every((s) => s.tier === 'uncharted');
}

export function shareText(flightNumber: number, stops: StopScore[], domain: string, unit: Unit = 'km'): string {
  const total = stops.reduce((a, s) => a + s.km, 0);
  const eyes = stops.filter((s) => s.redEye).length;
  const lines = [
    `Off the Map #${flightNumber} ✈️ ${dist(total, unit)} ${unit}`,
    stops.map((s) => TIERS[s.tier].emoji).join(''),
  ];
  if (eyes) lines.push(`${REDEYE.emoji} Red-Eye ×${eyes}`);
  lines.push('Bon voyage. No spoilers.');
  if (domain) lines.push(domain);
  return lines.join('\n');
}

export function fmt(n: number): string {
  return Math.round(n).toLocaleString('en-US');
}

/** "3,557" — a km value shown in the chosen unit. */
export function dist(km: number, unit: Unit): string {
  return fmt(toUnit(km, unit));
}

/** "31%", "6%", "0.4%", "<0.1%" */
export function pct(share: number): string {
  const p = share * 100;
  if (p >= 1) return `${Math.round(p)}%`;
  if (p >= 0.1) return `${p.toFixed(1)}%`;
  return '<0.1%';
}
