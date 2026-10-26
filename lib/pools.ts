/* Autocomplete pools. Safe to ship to the browser: a pool lists every country / state, never which ones are correct. */
import country from '@/data/pools/country.json';
import usState from '@/data/pools/us_state.json';

export type PoolEntry = { id: string; name: string; aliases?: string[]; wiki?: string };
export type PoolName = 'country' | 'us_state';

export const POOLS: Record<PoolName, PoolEntry[]> = {
  country: country as PoolEntry[],
  us_state: usState as PoolEntry[],
};

export function isPoolName(p: string): p is PoolName {
  return p in POOLS;
}

const byId = new Map<string, Map<string, PoolEntry>>();
export function poolEntry(pool: PoolName, id: string): PoolEntry | undefined {
  let m = byId.get(pool);
  if (!m) { m = new Map(POOLS[pool].map((e) => [e.id, e])); byId.set(pool, m); }
  return m.get(id);
}

/** Lowercase, strip accents and punctuation, collapse spaces: "São Tomé" → "sao tome", "St. Lucia" → "st lucia". */
export function normalize(s: string): string {
  return s
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/['’.]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

export type Suggestion = { entry: PoolEntry; via?: string };

type Indexed = { entry: PoolEntry; keys: { text: string; alias?: string }[] };
const indexCache = new Map<PoolName, Indexed[]>();
function index(pool: PoolName): Indexed[] {
  let ix = indexCache.get(pool);
  if (!ix) {
    ix = POOLS[pool].map((entry) => ({
      entry,
      keys: [{ text: normalize(entry.name) }, ...(entry.aliases ?? []).map((a) => ({ text: normalize(a), alias: a }))],
    }));
    indexCache.set(pool, ix);
  }
  return ix;
}

/** Prefix matches first (name, then alias, then any word), then substring; ties alphabetical. */
export function search(pool: PoolName, query: string, limit = 4): Suggestion[] {
  const q = normalize(query);
  if (!q) return [];
  const scored: { s: Suggestion; rank: number }[] = [];
  for (const { entry, keys } of index(pool)) {
    let best: { rank: number; via?: string } | null = null;
    for (const k of keys) {
      let rank = -1;
      if (k.text.startsWith(q)) rank = k.alias ? 1 : 0;
      else if (k.text.split(' ').some((w) => w.startsWith(q))) rank = 2;
      else if (k.text.includes(q)) rank = 3;
      if (rank >= 0 && (!best || rank < best.rank)) best = { rank, via: k.alias };
    }
    if (best) scored.push({ s: { entry, via: best.via }, rank: best.rank });
  }
  scored.sort((a, b) => a.rank - b.rank || a.s.entry.name.localeCompare(b.s.entry.name));
  return scored.slice(0, limit).map((x) => x.s);
}
