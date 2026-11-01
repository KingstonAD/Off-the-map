import { beforeEach, describe, expect, it } from 'vitest';
import fs from 'node:fs';
import { addDays, LAUNCH_DATE } from '@/lib/time';
import { rarityFor, type Flight } from '@/lib/flight-types';
import { answerStop, GameError, getProgress, logbook, results, startStop, yesterday } from '@/lib/game';
import { resolve } from '@/lib/pools';
import { kmFor, tierFor } from '@/lib/scoring';
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

  it('scores from the fixed rarity, the same no matter how many others answered', async () => {
    const stop = base.stops[0];
    await startStop(store, load, pid(200), D1, 0, T0);
    const first = await answerStop(store, load, pid(200), D1, 0, 'RU', T0 + 3000);
    for (let i = 0; i < 50; i++) {
      await startStop(store, load, pid(i), D1, 0, T0);
      await answerStop(store, load, pid(i), D1, 0, 'RU', T0 + 3000);
    }
    await startStop(store, load, pid(201), D1, 0, T0);
    const later = await answerStop(store, load, pid(201), D1, 0, 'RU', T0 + 3000);
    expect(later).toMatchObject({ km: first.km, tier: first.tier, rarity: first.rarity });
    expect(first.km).toBe(kmFor(rarityFor(stop, 'RU')));
    expect(first.tier).toBe(tierFor(rarityFor(stop, 'RU')));
    // Everyone said Russia, yet it still scores its fixed rarity, not ~100%.
    expect(later.crowd?.yours?.share).toBe(1);
    expect(later.km).toBeGreaterThan(0);
  });

  it('uses a rarity override from the flight file', async () => {
    const plain = await (async () => {
      await startStop(store, load, pid(1), D1, 0, T0);
      return answerStop(store, load, pid(1), D1, 0, 'TJ', T0 + 3000);
    })();
    const f: Flight = JSON.parse(JSON.stringify(base));
    f.stops[0].answers.find((a) => a.id === 'TJ')!.rarity = 0.5;
    const s2 = createMemoryStore();
    const load2 = (d: string) => (d === D1 ? f : null);
    await startStop(s2, load2, pid(1), D1, 0, T0);
    const over = await answerStop(s2, load2, pid(1), D1, 0, 'TJ', T0 + 3000);
    expect(over).toMatchObject({ rarity: 0.5, km: kmFor(0.5), tier: 'tourist' });
    expect(over.km).not.toBe(plain.km);
  });

  it('hides crowd stats under 20 answers and shows the real share from 20', async () => {
    // 19 answers to stop 1: 9 Russia, 5 Tajikistan, 3 wrong, 2 timed out (wrong ones count toward the 20).
    const picks = [...Array(9).fill('RU'), ...Array(5).fill('TJ'), 'FR', 'FR', 'FR', null, null];
    let last;
    for (let i = 0; i < picks.length; i++) {
      await startStop(store, load, pid(i), D1, 0, T0);
      last = await answerStop(store, load, pid(i), D1, 0, picks[i], T0 + 3000);
    }
    expect(last!.crowd).toBeNull();
    expect((await yesterday(store, load, D2))!.stops[0]).toMatchObject({ ready: false, rarest: null });

    await startStop(store, load, pid(19), D1, 0, T0);
    const r = await answerStop(store, load, pid(19), D1, 0, 'RU', T0 + 3000);
    expect(r.crowd).not.toBeNull();
    expect(r.crowd!.answered).toBe(20);
    expect(r.crowd!.top[0]).toMatchObject({ id: 'RU', share: 10 / 15 });
    expect(r.crowd!.yours).toMatchObject({ id: 'RU', share: 10 / 15 });
    expect(r.crowd!.top[1]).toMatchObject({ id: 'TJ', share: 5 / 15 });
    // The crowd panel carries each answer's fixed score, not one derived from the crowd.
    expect(r.crowd!.top[1].km).toBe(kmFor(rarityFor(base.stops[0], 'TJ')));

    const y = (await yesterday(store, load, D2))!.stops[0];
    expect(y).toMatchObject({ ready: true, travellers: 20, correct: 15 });
    expect(y.rarest).toMatchObject({ id: 'TJ', share: 5 / 15 });
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
    // One traveller is under the crowd threshold: no shares, no rarest answer.
    expect(y.stops[0].ready).toBe(false);
    expect(y.stops[0].rarest).toBeNull();
    expect(y.stops[0].answers.every((a) => a.share === null)).toBe(true);
    expect(r.stops[0].rarity).toBe(rarityFor(base.stops[0], 'TJ'));
    expect(r.stops[0].crowd).toBeNull();

    await play(P, D2, picks, T0 + 86400_000);
    const log = await logbook(store, P, D2);
    expect(log).toMatchObject({ streak: 2, bestStreak: 2, flightsFlown: 2, stopsFlown: 14 });
    expect(log.tierCounts.lost).toBe(2);
    // The streak survives until the next day's flight closes.
    expect((await logbook(store, P, addDays(D1, 2))).streak).toBe(2);
    expect((await logbook(store, P, addDays(D1, 3))).streak).toBe(0);
  });
});
