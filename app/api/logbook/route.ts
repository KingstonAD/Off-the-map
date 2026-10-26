import { logbook } from '@/lib/game';
import { handle, playerId, store, today } from '@/lib/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  return handle(async () => logbook(store(), await playerId(), today()));
}
