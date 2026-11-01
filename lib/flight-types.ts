import { isPoolName, poolEntry, type PoolName } from '@/lib/pools';

/** `prior` comes from `npm run priors`. `rarity`, if set, overrides it as the answer's fixed scoring rarity. */
export type Answer = { id: string; name: string; aliases?: string[]; prior?: number; rarity?: number };
export type Stop = {
  id: string;
  prompt: string;
  board: string[];
  category: string;
  pool: PoolName;
  answers: Answer[];
  notes?: string;
};
export type Flight = { flight: number; date: string; stops: Stop[] };

export const MIN_ANSWERS = 8;
export const BOARD_COLS = 14;
export const BOARD_ROWS = 3;

/** Every rule `npm run check-flights` enforces. Returns errors and (non-fatal) warnings. */
export function validateFlight(f: Flight, expectedNumber?: number): { errors: string[]; warnings: string[] } {
  const errors: string[] = [], warnings: string[] = [];
  if (expectedNumber !== undefined && f.flight !== expectedNumber) errors.push(`flight number is ${f.flight}, expected ${expectedNumber} for ${f.date}`);
  if (f.stops.length !== 7) errors.push(`has ${f.stops.length} stops, expected 7`);
  f.stops.forEach((s, i) => {
    const at = `stop ${i + 1} (${s.id})`;
    if (!isPoolName(s.pool)) { errors.push(`${at}: unknown pool "${s.pool}"`); return; }
    if (s.answers.length < MIN_ANSWERS) errors.push(`${at}: only ${s.answers.length} valid answers (min ${MIN_ANSWERS})`);
    if (!s.board.length || s.board.length > BOARD_ROWS) errors.push(`${at}: board has ${s.board.length} lines (max ${BOARD_ROWS})`);
    s.board.forEach((line) => {
      if (line.length > BOARD_COLS) errors.push(`${at}: board line "${line}" is ${line.length} chars (max ${BOARD_COLS})`);
      if (line !== line.toUpperCase()) errors.push(`${at}: board line "${line}" is not uppercase`);
    });
    const seen = new Set<string>();
    for (const a of s.answers) {
      if (seen.has(a.id)) errors.push(`${at}: answer id ${a.id} repeated`);
      seen.add(a.id);
      const e = poolEntry(s.pool, a.id);
      if (a.rarity !== undefined && !(typeof a.rarity === 'number' && a.rarity > 0 && a.rarity <= 1)) {
        errors.push(`${at}: rarity for ${a.id} is ${JSON.stringify(a.rarity)} (must be > 0 and <= 1)`);
      }
      if (!e) { errors.push(`${at}: answer id ${a.id} (${a.name}) is not in pool "${s.pool}"`); continue; }
      for (const al of a.aliases ?? []) {
        if (al !== e.name && !(e.aliases ?? []).includes(al)) warnings.push(`${at}: alias "${al}" for ${a.id} is not in the ${s.pool} pool, so typed answers won't match it`);
      }
    }
    const priors = s.answers.map((a) => a.prior);
    if (priors.some((p) => p === undefined)) warnings.push(`${at}: missing priors (run npm run priors); falling back to uniform`);
  });
  return { errors, warnings };
}

/** Prior for an answer, falling back to uniform when the priors script hasn't run. */
export function priorFor(stop: Stop, entityId: string): number {
  const a = stop.answers.find((x) => x.id === entityId);
  if (!a) return 0;
  if (stop.answers.every((x) => typeof x.prior === 'number')) return a.prior!;
  return 1 / stop.answers.length;
}

/** The fixed rarity that scores an answer: the flight file's override, else the Wikipedia prior. 0 if not a valid answer. */
export function rarityFor(stop: Stop, entityId: string): number {
  const a = stop.answers.find((x) => x.id === entityId);
  if (!a) return 0;
  return a.rarity ?? priorFor(stop, entityId);
}

/** "Name a country bordering China" → "Country bordering China" */
export function shortPrompt(prompt: string): string {
  const s = prompt.replace(/^name (a|an|the) /i, '');
  return s.charAt(0).toUpperCase() + s.slice(1);
}
