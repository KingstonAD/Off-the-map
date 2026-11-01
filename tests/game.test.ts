import { beforeEach, describe, expect, it } from 'vitest';
import fs from 'node:fs';
import { addDays, LAUNCH_DATE } from '@/lib/time';
import type { Flight } from '@/lib/flight-types';
import { answerStop, GameError, getProgress, logbook, results, startStop, yesterday } from '@/lib/game';
import { resolve } from '@/lib/pools';
import { createMemoryStore } from '@/lib/store/memory';
import type { Store } from '@/lib/store/types';

const base: Flight = JSON.parse(fs.readFileSync(`data/flights/${LAUNCH_DATE}.json`, 'utf8'));
const D1 = LAUNCH_DATE;
const D2 = addDays(D1, 1);
const flights: Record<string, Flight> = { [D1]: base, [D2]: { ...base, flight: 2, date: D2 } };
const load = (d: string) => flights[d] ?? null;
const P = '11111111-1111-4111-8111-111111111111';
const pid = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const T0 = Date.UTC(2026, 9, 27, 14, 0, 0);

let store: Store;
beforeEach(() => { store = createMemoryStore(); });

async function play(player: string, date: string, picks: (string | null)[], at = T0) {
  let t = at;
  for (let i = 0; i < picks.length; i++) {
    await startStop(store, load, player, date, i, t);
    await answerStop(store, load, player, date, i, picks[i], t + 5000);
    t += 10_000;
  }
}

describe('game flow', () => {
  it('never sends answers when a stop starts', async () => {
    const s = await startStop(store, load, P, D1, 0, T0);
    expect(JSON.stringify(s)).not.toContain('"answers"');
    expect(s.board).toEqual(['NAME A COUNTRY', 'BORDERING', 'CHINA']);
    expect(s.remainingMs).toBe(20_000);
  });

  it('enforces stop order', async () => {
    await expect(startStop(store, load, P, D1, 1, T0)).rejects.toThrow(GameError);
  });

  it('judges correct, wrong and late answers and locks in the score', async () => {
    await startStop(store, load, P, D1, 0, T0);
    const r = await answerStop(store, load, P, D1, 0, 'TJ', T0 + 4000);
    expect(r.correct).toBe(true);
    expect(r.km).toBeGreaterThan(0);
    expect(r.redEye).toBe(false);

    // A second submission is ignored; the stamped answer stands.
    const again = await answerStop(store, load, P, D1, 0, 'RU', T0 + 5000);
    expect(again.entityId).toBe('TJ');
    expect(again.km).toBe(r.km);

    await startStop(store, load, P, D1, 1, T0 + 10_000);
    const wrong = await answerStop(store, load, P, D1, 1, 'FR', T0 + 12_000);
    expect(wrong).toMatchObject({ tier: 'lost', km: 0, correct: false, timedOut: false });

    await startStop(store, load, P, D1, 2, T0 + 20_000);
    const late = await answerStop(store, load, P, D1, 2, 'EC', T0 + 20_000 + 21_600);
    expect(late).toMatchObject({ tier: 'lost', km: 0, late: true, timedOut: true });
  });

  it('awards Red-Eye by server timing, as a badge only', async () => {
    await startStop(store, load, pid(1), D1, 0, T0);
    const a = await answerStop(store, load, pid(1), D1, 0, 'IN', T0 + 17_000);
    await startStop(store, load, pid(2), D1, 0, T0);
    const b = await answerStop(store, load, pid(2), D1, 0, 'IN', T0 + 16_900);
    expect(a.redEye).toBe(true);
    expect(b.redEye).toBe(false);
  });

  it('rejects entities outside the pool', async () => {
    await startStop(store, load, P, D1, 0, T0);
    await expect(answerStop(store, load, P, D1, 0, 'US-NY', T0 + 1000)).rejects.toThrow('not_in_pool');
  });

  it('stamps a recognised but wrong typed answer as Lost Luggage', async () => {
    // Stop 1 asks for China's neighbours. France is in the pool, so "FRANCE" resolves and the server judges it.
    const typed = resolve('country', 'FRANCE');
    expect(typed).toMatchObject({ kind: 'exact', entry: { id: 'FR' } });
    await startStop(store, load, P, D1, 0, T0);
    const r = await answerStop(store, load, P, D1, 0, 'FR', T0 + 3000);
    expect(r).toMatchObject({ entityId: 'FR', tier: 'lost', km: 0, correct: false });
  });

  it('turns an abandoned stop into Lost Luggage and resumes at the next one', async () => {
    await startStop(store, load, P, D1, 0, T0);
    const p = await getProgress(store, load, P, D1, T0 + 60_000);
    expect(p).toMatchObject({ answered: 1, nextStop: 1, tiers: ['lost', null, null, null, null, null, null] });
  });

  it('resumes an open stop with the time that is left', async () => {
    await startStop(store, load, P, D1, 0, T0);
    const s = await startStop(store, load, P, D1, 0, T0 + 8000);
    expect(s.remainingMs).toBe(12_000);
  });

  it('scores popular answers lower as the crowd grows', async () => {
    for (let i = 0; i < 30; i++) {
      await startStop(store, load, pid(i), D1, 0, T0);
      await answerStop(store, load, pid(i), D1, 0, 'RU', T0 + 3000);
    }
    await startStop(store, load, pid(100), D1, 0, T0);
    const ru = await answerStop(store, load, pid(100), D1, 0, 'RU', T0 + 3000);
    await startStop(store, load, pid(101), D1, 0, T0);
    const tj = await answerStop(store, load, pid(101), D1, 0, 'TJ', T0 + 3000);
    expect(tj.km).toBeGreaterThan(ru.km);
    expect(ru.top[0].id).toBe('RU');
  });

  it('builds results, yesterday and the logbook', async () => {
    const picks = ['TJ', 'LS', 'KI', 'SR', 'DM', 'US-ND', null];
    await play(P, D1, picks);
    const r = (await results(store, load, P, D1))!;
    expect(r.complete).toBe(true);
    expect(r.totalKm).toBe(r.stops.reduce((a, s) => a + s.km, 0));
    expect(r.stops[6].tier).toBe('lost');
    expect(r.best).not.toBeNull();

    const y = (await yesterday(store, load, D2))!;
    expect(y.flight).toBe(1);
    expect(y.stops[0].travellers).toBe(1);
    expect(y.stops[0].rarest?.id).toBe('TJ');
    // Yesterday uses the raw crowd share, not the blended scoring share.
    expect(y.stops[0].rarest?.share).toBe(1);
    expect(y.stops[0].answers.filter((a) => a.count === 0).every((a) => a.share === 0)).toBe(true);
    expect(r.stops[0].share).toBeLessThan(1); // the locked-in score stays blended

    await play(P, D2, picks, T0 + 86400_000);
    const log = await logbook(store, P, D2);
    expect(log).toMatchObject({ streak: 2, bestStreak: 2, flightsFlown: 2, stopsFlown: 14 });
    expect(log.tierCounts.lost).toBe(2);
    // The streak survives until the next day's flight closes.
    expect((await logbook(store, P, addDays(D1, 2))).streak).toBe(2);
    expect((await logbook(store, P, addDays(D1, 3))).streak).toBe(0);
  });
});
