import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { PlayRow, StopCounts, Store } from './types';

const PLAY_COLS = 'player_id, flight_date, stop_index, entity_id, served_at, answered_at, share, km, tier, red_eye';

export function createSupabaseStore(url: string, serviceKey: string): Store {
  const db: SupabaseClient = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });

  const must = <T>(r: { data: T | null; error: { message: string } | null }): T => {
    if (r.error) throw new Error(r.error.message);
    return r.data as T;
  };

  return {
    async startStop(playerId, flightDate, stopIndex, servedAt) {
      must(await db.from('plays').upsert(
        { player_id: playerId, flight_date: flightDate, stop_index: stopIndex, served_at: servedAt },
        { onConflict: 'player_id,flight_date,stop_index', ignoreDuplicates: true },
      ));
      return must(await db.from('plays').select(PLAY_COLS)
        .eq('player_id', playerId).eq('flight_date', flightDate).eq('stop_index', stopIndex).single()) as PlayRow;
    },

    async submit(a) {
      const rows = must(await db.rpc('otm_submit_answer', {
        p_player: a.playerId,
        p_flight_date: a.flightDate,
        p_stop: a.stopIndex,
        p_entity: a.entityId,
        p_correct: a.correct,
        p_prior: a.rarity, // parameter name kept from 0001; it now carries the fixed rarity
        p_red_eye: a.redEye,
        p_answered_at: a.answeredAt,
      })) as PlayRow[] | PlayRow;
      return Array.isArray(rows) ? rows[0] : rows;
    },

    async playsFor(playerId, flightDate) {
      return must(await db.from('plays').select(PLAY_COLS).eq('player_id', playerId).eq('flight_date', flightDate)) as PlayRow[];
    },

    async allPlays(playerId) {
      return must(await db.from('plays').select(PLAY_COLS).eq('player_id', playerId).order('flight_date')) as PlayRow[];
    },

    async counts(flightDate) {
      const [totals, counts] = await Promise.all([
        db.from('stop_totals').select('stop_index, correct_count, total_count').eq('flight_date', flightDate),
        db.from('answer_counts').select('stop_index, entity_id, count').eq('flight_date', flightDate),
      ]);
      const out: Record<number, StopCounts> = {};
      const get = (s: number) => (out[s] ??= { counts: {}, correct: 0, total: 0 });
      for (const t of must(totals) as { stop_index: number; correct_count: number; total_count: number }[]) {
        Object.assign(get(t.stop_index), { correct: t.correct_count, total: t.total_count });
      }
      for (const c of must(counts) as { stop_index: number; entity_id: string; count: number }[]) get(c.stop_index).counts[c.entity_id] = c.count;
      return out;
    },
  };
}
