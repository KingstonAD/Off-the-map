import 'server-only';
import fs from 'node:fs';
import path from 'node:path';
import type { Flight } from '@/lib/flight-types';

const DIR = path.join(process.cwd(), 'data', 'flights');
const cache = new Map<string, Flight | null>();

/** Flights live in data/flights/YYYY-MM-DD.json and ship with the deploy. Never send `answers` to the client unjudged. */
export function loadFlight(date: string): Flight | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;
  if (cache.has(date)) return cache.get(date)!;
  let f: Flight | null = null;
  try {
    f = JSON.parse(fs.readFileSync(path.join(DIR, `${date}.json`), 'utf8')) as Flight;
  } catch {
    f = null;
  }
  cache.set(date, f);
  return f;
}

export function hasFlight(date: string): boolean {
  return loadFlight(date) !== null;
}
