import { yesterday } from '@/lib/game';
import { handle, load, store, today } from '@/lib/server';

export const dynamic = 'force-dynamic';

/** Final shares for every answer of yesterday's (closed) flight. */
export async function GET() {
  return handle(async () => ({ result: await yesterday(store(), load, today()) }));
}
