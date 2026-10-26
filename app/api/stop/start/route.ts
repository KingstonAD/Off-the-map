import { GameError, startStop } from '@/lib/game';
import { handle, load, playerId, store, today } from '@/lib/server';

export const dynamic = 'force-dynamic';

/** Serves a stop's board and records the server start time. */
export async function POST(req: Request) {
  return handle(async () => {
    const body = await req.json().catch(() => ({}));
    if (!Number.isInteger(body.stop)) throw new GameError('bad_request');
    return startStop(store(), load, await playerId(), today(), body.stop);
  });
}
