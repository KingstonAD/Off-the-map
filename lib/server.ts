import 'server-only';
import { cookies, headers } from 'next/headers';
import { NextResponse } from 'next/server';
import { GameError } from '@/lib/game';
import { loadFlight } from '@/lib/flights';
import { getStore } from '@/lib/store';
import { etDate } from '@/lib/time';

export const COOKIE = 'otm_pid';
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/** Anonymous player ID: httpOnly cookie, restored from the localStorage mirror (x-otm-player header) if the cookie is gone. */
export async function playerId(): Promise<string> {
  const jar = await cookies();
  let id = jar.get(COOKIE)?.value;
  if (!id || !UUID.test(id)) {
    const mirrored = (await headers()).get('x-otm-player');
    id = mirrored && UUID.test(mirrored) ? mirrored : crypto.randomUUID();
  }
  jar.set(COOKIE, id, { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', path: '/', maxAge: 60 * 60 * 24 * 400 });
  return id;
}

/** Today's ET date. OTM_TODAY_OVERRIDE is honoured outside Vercel production, for testing. */
export function today(): string {
  const o = process.env.OTM_TODAY_OVERRIDE;
  if (o && /^\d{4}-\d{2}-\d{2}$/.test(o) && process.env.VERCEL_ENV !== 'production') return o;
  return etDate();
}

export const store = () => getStore();
export const load = loadFlight;

export async function handle<T>(fn: () => Promise<T>): Promise<NextResponse> {
  try {
    return NextResponse.json(await fn(), { headers: { 'cache-control': 'no-store' } });
  } catch (e) {
    if (e instanceof GameError) return NextResponse.json({ error: e.code }, { status: e.status });
    console.error(e);
    return NextResponse.json({ error: 'server_error' }, { status: 500 });
  }
}
