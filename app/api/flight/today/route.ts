import { getProgress, logbook } from '@/lib/game';
import { handle, load, playerId, store, today } from '@/lib/server';
import { addDays, flightNumberFor, LAUNCH_DATE } from '@/lib/time';

export const dynamic = 'force-dynamic';

/** Flight number, date, stop count and the player's progress. Never prompts or answers. */
export async function GET() {
  return handle(async () => {
    const pid = await playerId();
    const date = today();
    const [progress, log] = await Promise.all([getProgress(store(), load, pid, date), logbook(store(), pid, date)]);
    return {
      playerId: pid,
      date,
      flightNumber: flightNumberFor(date),
      launch: LAUNCH_DATE,
      progress,
      streak: log.streak,
      bestStreak: log.bestStreak,
      upcoming: [1, 2].map((n) => { const d = addDays(date, n); return { date: d, flight: flightNumberFor(d) }; }),
    };
  });
}
