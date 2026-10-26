import type { Tier } from '@/lib/scoring';

export type PlayRow = {
  player_id: string;
  flight_date: string;
  stop_index: number;
  entity_id: string | null;
  served_at: string; // ISO
  answered_at: string | null;
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
  prior: number;
  redEye: boolean;
  answeredAt: string;
};

export type StopCounts = { counts: Record<string, number>; correct: number; total: number };

export interface Store {
  /** Insert the play row with served_at if it doesn't exist yet. Returns the row either way. */
  startStop(playerId: string, flightDate: string, stopIndex: number, servedAt: string): Promise<PlayRow>;
  /** Atomically: count the answer, compute the share, lock in km/tier on the play. Idempotent once answered. */
  submit(a: SubmitArgs): Promise<PlayRow>;
  playsFor(playerId: string, flightDate: string): Promise<PlayRow[]>;
  allPlays(playerId: string): Promise<PlayRow[]>;
  counts(flightDate: string): Promise<Record<number, StopCounts>>;
}
