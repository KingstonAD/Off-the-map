import type { Tier } from '@/lib/scoring';

export type PlayRow = {
  player_id: string;
  flight_date: string;
  stop_index: number;
  entity_id: string | null;
  served_at: string; // ISO
  answered_at: string | null;
  /** Column `share`: the fixed rarity this play was scored with (not a crowd share). Null for Lost Luggage. */
  share: number | null;
  km: number | null;
  tier: Tier | null;
  red_eye: boolean;
};

export type SubmitArgs = {
  playerId: string;
  flightDate: string;
  stopIndex: number;
  entityId: string | null;
  correct: boolean;
  /** Fixed rarity of the answer (rarityFor); sets km and tier. Ignored when not correct. */
  rarity: number;
  redEye: boolean;
  answeredAt: string;
};

export type StopCounts = { counts: Record<string, number>; correct: number; total: number };

export interface Store {
  /** Insert the play row with served_at if it doesn't exist yet. Returns the row either way. */
  startStop(playerId: string, flightDate: string, stopIndex: number, servedAt: string): Promise<PlayRow>;
  /** Atomically: count the answer (display-only crowd stats) and lock in km/tier from the rarity. Idempotent once answered. */
  submit(a: SubmitArgs): Promise<PlayRow>;
  playsFor(playerId: string, flightDate: string): Promise<PlayRow[]>;
  allPlays(playerId: string): Promise<PlayRow[]>;
  counts(flightDate: string): Promise<Record<number, StopCounts>>;
}
