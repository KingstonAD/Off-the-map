/* In-process store for local dev and tests when Supabase isn't configured.
   Mirrors otm_submit_answer() in supabase/migrations (latest: 0002_fixed_rarity.sql). */
import { kmFor, tierFor } from '@/lib/scoring';
import type { PlayRow, StopCounts, Store, SubmitArgs } from './types';

export type Data = {
  plays: Map<string, PlayRow>;
  counts: Map<string, number>; // date|stop|entity
  totals: Map<string, { correct: number; total: number }>; // date|stop
};

export const emptyData = (): Data => ({ plays: new Map(), counts: new Map(), totals: new Map() });

/** `onWrite` lets local dev persist the data between server restarts. */
export function createMemoryStore(data: Data = emptyData(), onWrite?: (d: Data) => void): Store {
  const pk = (p: string, d: string, s: number) => `${p}|${d}|${s}`;

  return {
    async startStop(playerId, flightDate, stopIndex, servedAt) {
      const k = pk(playerId, flightDate, stopIndex);
      let row = data.plays.get(k);
      if (!row) {
        row = { player_id: playerId, flight_date: flightDate, stop_index: stopIndex, entity_id: null, served_at: servedAt, answered_at: null, share: null, km: null, tier: null, red_eye: false };
        data.plays.set(k, row);
        onWrite?.(data);
      }
      return { ...row };
    },

    async submit(a: SubmitArgs) {
      const k = pk(a.playerId, a.flightDate, a.stopIndex);
      const row = data.plays.get(k);
      if (!row) throw new Error('stop_not_started');
      if (row.answered_at) return { ...row };

      const tk = `${a.flightDate}|${a.stopIndex}`;
      const t = data.totals.get(tk) ?? { correct: 0, total: 0 };
      t.total += 1;
      row.entity_id = a.entityId;
      row.answered_at = a.answeredAt;
      if (a.correct && a.entityId) {
        t.correct += 1;
        const ck = `${tk}|${a.entityId}`;
        data.counts.set(ck, (data.counts.get(ck) ?? 0) + 1);
        row.share = a.rarity;
        row.km = kmFor(a.rarity);
        row.tier = tierFor(a.rarity);
        row.red_eye = a.redEye;
      } else {
        row.share = null;
        row.km = 0;
        row.tier = 'lost';
        row.red_eye = false;
      }
      data.totals.set(tk, t);
      onWrite?.(data);
      return { ...row };
    },

    async playsFor(playerId, flightDate) {
      return [...data.plays.values()].filter((r) => r.player_id === playerId && r.flight_date === flightDate).map((r) => ({ ...r }));
    },

    async allPlays(playerId) {
      return [...data.plays.values()].filter((r) => r.player_id === playerId).map((r) => ({ ...r }));
    },

    async counts(flightDate) {
      const out: Record<number, StopCounts> = {};
      const get = (s: number) => (out[s] ??= { counts: {}, correct: 0, total: 0 });
      for (const [k, t] of data.totals) {
        const [d, s] = k.split('|');
        if (d === flightDate) Object.assign(get(+s), { correct: t.correct, total: t.total });
      }
      for (const [k, c] of data.counts) {
        const [d, s, e] = k.split('|');
        if (d === flightDate) get(+s).counts[e] = c;
      }
      return out;
    },
  };
}
