/* Answer pools. Safe to ship to the browser: a pool lists every country / state, never which ones are correct. */
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

/** Lowercase, strip accents, punctuation and a leading "the", collapse spaces: "São Tomé" → "sao tome", "The Gambia" → "gambia". */
export function normalize(s: string): string {
  return s
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/['’.]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/^the /, '');
}

type Indexed = { entry: PoolEntry; keys: string[] };
const indexCache = new Map<PoolName, Indexed[]>();
function index(pool: PoolName): Indexed[] {
  let ix = indexCache.get(pool);
  if (!ix) {
    ix = POOLS[pool].map((entry) => ({ entry, keys: [entry.name, ...(entry.aliases ?? [])].map(normalize) }));
    indexCache.set(pool, ix);
  }
  return ix;
}

/** Edit distance counting a swap of two adjacent letters as one edit (optimal string alignment). */
export function editDistance(a: string, b: string): number {
  const d = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array<number>(b.length).fill(0)]);
  for (let j = 1; j <= b.length; j++) d[0][j] = j;
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + cost);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1);
    }
  }
  return d[a.length][b.length];
}

/** Typos allowed against a name: 1 for short names (≤5 letters), 2 for medium (≤10), 3 for long. */
export const typoAllowance = (key: string) => (key.length <= 5 ? 1 : key.length <= 10 ? 2 : 3);

export type Resolution =
  | { kind: 'exact'; entry: PoolEntry }
  | { kind: 'close'; options: PoolEntry[] }
  | { kind: 'unknown' };

/** Resolve typed text against the WHOLE pool (never the valid answers): an exact name/alias, up to 2 close names, or nothing. */
export function resolve(pool: PoolName, text: string): Resolution {
  const q = normalize(text);
  if (!q) return { kind: 'unknown' };
  const ix = index(pool);
  // Spaces don't count for an exact match: "cote d ivoire", "newzealand".
  const bare = (s: string) => s.replace(/ /g, '');
  const exact = ix.find((x) => x.keys.some((k) => bare(k) === bare(q)));
  if (exact) return { kind: 'exact', entry: exact.entry };
  const close: { entry: PoolEntry; dist: number }[] = [];
  for (const { entry, keys } of ix) {
    let best = Infinity;
    for (const k of keys) {
      const dist = editDistance(q, k);
      if (dist <= typoAllowance(k)) best = Math.min(best, dist);
    }
    if (best < Infinity) close.push({ entry, dist: best });
  }
  if (!close.length) return { kind: 'unknown' };
  close.sort((a, b) => a.dist - b.dist || a.entry.name.localeCompare(b.entry.name));
  // A runner-up is offered only when it's nearly as close as the best guess ("ira" → Iran, Iraq).
  return { kind: 'close', options: close.slice(0, 2).filter((c) => c.dist <= close[0].dist + 1).map((c) => c.entry) };
}
