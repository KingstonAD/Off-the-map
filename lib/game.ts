/* Server-side game rules. Everything that judges, scores or reveals answers lives here, on top of a Store. */
import type { Flight, Stop } from '@/lib/flight-types';
import { priorFor, shortPrompt } from '@/lib/flight-types';
import { poolEntry } from '@/lib/pools';
import {
  blendShare, distancePhrase, GATE_MS, GRACE_MS, isCircumnavigation, judgeTiming, STOPS_PER_FLIGHT,
  type Tier,
} from '@/lib/scoring';
import { addDays, flightNumberFor } from '@/lib/time';
import type { PlayRow, StopCounts, Store } from '@/lib/store/types';

export class GameError extends Error {
  constructor(public code: string, public status = 400) { super(code); }
}

export type FlightLoader = (date: string) => Flight | null;

const answered = (r: PlayRow) => r.answered_at !== null;
const ms = (iso: string) => new Date(iso).getTime();

/** A stop served but never answered, past the gate + grace, is Lost Luggage. */
async function finalizeExpired(store: Store, rows: PlayRow[], now: number): Promise<PlayRow[]> {
  const out: PlayRow[] = [];
  for (const r of rows) {
    if (!answered(r) && now - ms(r.served_at) > GATE_MS + GRACE_MS) {
      out.push(await store.submit({
        playerId: r.player_id, flightDate: r.flight_date, stopIndex: r.stop_index, entityId: null,
        correct: false, prior: 0, redEye: false, answeredAt: new Date(ms(r.served_at) + GATE_MS).toISOString(),
      }));
    } else out.push(r);
  }
  return out.sort((a, b) => a.stop_index - b.stop_index);
}

export type Progress = {
  flight: number;
  date: string;
  stops: number;
  answered: number;
  nextStop: number | null; // null when the flight is complete
  complete: boolean;
  totalKm: number;
  tiers: (Tier | null)[]; // per stop, null = not yet answered
};

function progressOf(flight: Flight, rows: PlayRow[]): Progress {
  const done = rows.filter(answered);
  const tiers: (Tier | null)[] = flight.stops.map((_, i) => done.find((r) => r.stop_index === i)?.tier ?? null);
  const next = tiers.findIndex((t) => t === null);
  return {
    flight: flight.flight,
    date: flight.date,
    stops: flight.stops.length,
    answered: done.length,
    nextStop: next < 0 ? null : next,
    complete: next < 0,
    totalKm: done.reduce((a, r) => a + (r.km ?? 0), 0),
    tiers,
  };
}

export async function getProgress(store: Store, load: FlightLoader, playerId: string, date: string, now = Date.now()) {
  const flight = load(date);
  if (!flight) return null;
  const rows = await finalizeExpired(store, await store.playsFor(playerId, date), now);
  return progressOf(flight, rows);
}

export async function startStop(store: Store, load: FlightLoader, playerId: string, date: string, stopIndex: number, now = Date.now()) {
  const flight = load(date);
  if (!flight) throw new GameError('no_flight', 404);
  const rows = await finalizeExpired(store, await store.playsFor(playerId, date), now);
  const p = progressOf(flight, rows);
  if (p.complete) throw new GameError('flight_complete', 409);
  if (stopIndex !== p.nextStop) throw new GameError('wrong_stop', 409);

  const row = await store.startStop(playerId, date, stopIndex, new Date(now).toISOString());
  const stop = flight.stops[stopIndex];
  return {
    stop: stopIndex,
    prompt: stop.prompt,
    board: stop.board,
    category: stop.category,
    pool: stop.pool,
    remainingMs: Math.max(0, GATE_MS - (now - ms(row.served_at))),
    totalKm: p.totalKm,
    flight: flight.flight,
    date,
    previous: rows.filter(answered).map((r) => ({ stop: r.stop_index, tier: r.tier, name: nameOf(flight.stops[r.stop_index], r.entity_id) })),
  };
}

function nameOf(stop: Stop, id: string | null): string | null {
  if (!id) return null;
  return poolEntry(stop.pool, id)?.name ?? stop.answers.find((a) => a.id === id)?.name ?? id;
}

/** Current blended share for every valid answer of a stop, highest first. */
export function answerShares(stop: Stop, c: StopCounts | undefined) {
  const counts = c?.counts ?? {}, correct = c?.correct ?? 0;
  return stop.answers
    .map((a) => {
      const count = counts[a.id] ?? 0;
      return { id: a.id, name: nameOf(stop, a.id)!, count, share: blendShare(count, correct, priorFor(stop, a.id)) };
    })
    .sort((a, b) => b.share - a.share || a.name.localeCompare(b.name));
}

export async function answerStop(
  store: Store, load: FlightLoader, playerId: string, date: string, stopIndex: number, entityId: string | null, now = Date.now(),
) {
  const flight = load(date);
  if (!flight) throw new GameError('no_flight', 404);
  const stop = flight.stops[stopIndex];
  if (!stop) throw new GameError('bad_stop');
  if (entityId !== null && !poolEntry(stop.pool, entityId)) throw new GameError('not_in_pool');

  const rows = await store.playsFor(playerId, date);
  let row = rows.find((r) => r.stop_index === stopIndex);
  if (!row) throw new GameError('stop_not_started', 409);

  let late = false, leftMs = 0;
  if (!answered(row)) {
    const t = judgeTiming(ms(row.served_at), now);
    late = t.late;
    leftMs = t.leftMs;
    const correct = !late && entityId !== null && stop.answers.some((a) => a.id === entityId);
    row = await store.submit({
      playerId, flightDate: date, stopIndex,
      entityId: late ? null : entityId,
      correct,
      prior: correct ? priorFor(stop, entityId!) : 0,
      redEye: correct && t.redEyeWindow,
      answeredAt: new Date(late ? ms(row.served_at) + GATE_MS : now).toISOString(),
    });
  } else {
    leftMs = GATE_MS - (ms(row.answered_at!) - ms(row.served_at));
  }

  const counts = (await store.counts(date))[stopIndex];
  const shares = answerShares(stop, counts);
  const all = await store.playsFor(playerId, date);
  return {
    stop: stopIndex,
    flight: flight.flight,
    date,
    entityId: row.entity_id,
    name: nameOf(stop, row.entity_id),
    correct: row.tier !== 'lost',
    timedOut: row.tier === 'lost' && row.entity_id === null,
    late,
    tier: row.tier!,
    km: row.km ?? 0,
    share: row.share,
    redEye: row.red_eye,
    leftMs: Math.max(0, leftMs),
    top: shares.slice(0, 4).map(({ id, name, share }) => ({ id, name, share })),
    yours: row.tier !== 'lost' ? shares.find((s) => s.id === row!.entity_id) ?? null : null,
    totalKm: all.filter(answered).reduce((a, r) => a + (r.km ?? 0), 0),
    isLast: stopIndex === STOPS_PER_FLIGHT - 1,
  };
}

export async function results(store: Store, load: FlightLoader, playerId: string, date: string, now = Date.now()) {
  const flight = load(date);
  if (!flight) return null;
  const rows = (await finalizeExpired(store, await store.playsFor(playerId, date), now)).filter(answered);
  const stops = flight.stops.map((s, i) => {
    const r = rows.find((x) => x.stop_index === i);
    return {
      stop: i,
      prompt: shortPrompt(s.prompt),
      category: s.category,
      name: r ? nameOf(s, r.entity_id) : null,
      tier: (r?.tier ?? null) as Tier | null,
      km: r?.km ?? 0,
      share: r?.share ?? null,
      redEye: r?.red_eye ?? false,
      answered: !!r,
    };
  });
  const scored = stops.filter((s) => s.tier !== null).map((s) => ({ tier: s.tier!, km: s.km, redEye: s.redEye }));
  const totalKm = scored.reduce((a, s) => a + s.km, 0);
  const best = stops
    .filter((s) => s.tier && s.tier !== 'lost')
    .sort((a, b) => b.km - a.km || (a.share ?? 1) - (b.share ?? 1))[0] ?? null;
  return {
    flight: flight.flight,
    date,
    complete: scored.length === flight.stops.length,
    stops,
    totalKm,
    redEyes: scored.filter((s) => s.redEye).length,
    circumnavigation: isCircumnavigation(scored),
    phrase: distancePhrase(totalKm, scored),
    best,
  };
}

/** Yesterday shows the real crowd share (count ÷ correct answers), not the blended scoring share. */
export async function yesterday(store: Store, load: FlightLoader, today: string) {
  const date = addDays(today, -1);
  const flight = load(date);
  if (!flight) return null;
  const counts = await store.counts(date);
  return {
    flight: flight.flight,
    date,
    stops: flight.stops.map((s, i) => {
      const correct = counts[i]?.correct ?? 0;
      const answers = s.answers
        .map((a) => {
          const count = counts[i]?.counts[a.id] ?? 0;
          return { id: a.id, name: nameOf(s, a.id)!, count, share: correct ? count / correct : 0 };
        })
        .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
      const said = answers.filter((x) => x.count > 0);
      return {
        stop: i,
        prompt: s.prompt,
        board: s.board,
        category: s.category,
        travellers: counts[i]?.total ?? 0,
        correct,
        answers,
        rarest: said.length ? said[said.length - 1] : null,
      };
    }),
  };
}

export type FlightLog = { date: string; flight: number; km: number; complete: boolean; tiers: Tier[]; redEyes: number; circumnavigation: boolean };

export async function logbook(store: Store, playerId: string, today: string) {
  const rows = (await store.allPlays(playerId)).filter(answered);
  const byDate = new Map<string, PlayRow[]>();
  for (const r of rows) byDate.set(r.flight_date, [...(byDate.get(r.flight_date) ?? []), r]);

  const flights: FlightLog[] = [...byDate.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([date, rs]) => {
    const sorted = rs.sort((a, b) => a.stop_index - b.stop_index);
    const scored = sorted.map((r) => ({ tier: r.tier!, km: r.km ?? 0, redEye: r.red_eye }));
    return {
      date,
      flight: flightNumberFor(date),
      km: scored.reduce((a, s) => a + s.km, 0),
      complete: sorted.length === STOPS_PER_FLIGHT,
      tiers: scored.map((s) => s.tier),
      redEyes: scored.filter((s) => s.redEye).length,
      circumnavigation: isCircumnavigation(scored),
    };
  });
  const completed = flights.filter((f) => f.complete);
  const doneDates = new Set(completed.map((f) => f.date));

  // Streak: consecutive completed flights by ET date, ending today (or yesterday if today isn't flown yet).
  let streak = 0;
  for (let d = doneDates.has(today) ? today : addDays(today, -1); doneDates.has(d); d = addDays(d, -1)) streak++;
  let best = 0, run = 0, prev: string | null = null;
  for (const f of completed) {
    run = prev && addDays(prev, 1) === f.date ? run + 1 : 1;
    best = Math.max(best, run);
    prev = f.date;
  }

  const longest = completed.reduce<FlightLog | null>((a, f) => (!a || f.km > a.km ? f : a), null);
  const circ = completed.filter((f) => f.circumnavigation);
  const tierCounts: Record<Tier, number> = { tourist: 0, backpacker: 0, explorer: 0, uncharted: 0, lost: 0 };
  for (const r of rows) tierCounts[r.tier!]++;

  return {
    streak,
    bestStreak: Math.max(best, streak),
    longest: longest ? { km: longest.km, flight: longest.flight } : null,
    circumnavigations: circ.length,
    lastCircumnavigation: circ.length ? circ[circ.length - 1].flight : null,
    flightsFlown: completed.length,
    avgKm: completed.length ? Math.round(completed.reduce((a, f) => a + f.km, 0) / completed.length) : 0,
    last14: flights.slice(-14).map(({ flight, km, complete, date }) => ({ flight, km, complete, today: date === today })),
    tierCounts,
    stopsFlown: rows.length,
    redEyes: rows.filter((r) => r.red_eye).length,
  };
}
