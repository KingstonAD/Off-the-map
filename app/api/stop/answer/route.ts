import { answerStop, GameError } from '@/lib/game';
import { handle, load, playerId, store, today } from '@/lib/server';

export const dynamic = 'force-dynamic';

/** Judges an answer (entityId null = gate closed), locks in km/tier, returns the reveal. */
export async function POST(req: Request) {
  const now = Date.now();
  return handle(async () => {
    const body = await req.json().catch(() => ({}));
    if (!Number.isInteger(body.stop)) throw new GameError('bad_request');
    const entityId = typeof body.entityId === 'string' ? body.entityId : null;
    return answerStop(store(), load, await playerId(), today(), body.stop, entityId, now);
  });
}
