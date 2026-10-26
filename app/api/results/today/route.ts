import { GameError, results } from '@/lib/game';
import { handle, load, playerId, store, today } from '@/lib/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  return handle(async () => {
    const r = await results(store(), load, await playerId(), today());
    if (!r) throw new GameError('no_flight', 404);
    return { ...r, domain: process.env.NEXT_PUBLIC_SITE_DOMAIN ?? '' };
  });
}
