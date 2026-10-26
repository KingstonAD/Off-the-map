import 'server-only';
import fs from 'node:fs';
import path from 'node:path';
import { createMemoryStore, emptyData, type Data } from './memory';
import { createSupabaseStore } from './supabase';
import type { Store } from './types';

const g = globalThis as unknown as { __otmStore?: Store };

/** Supabase when configured; otherwise an in-memory store (local dev only). */
export function getStore(): Store {
  if (g.__otmStore) return g.__otmStore;
  const url = process.env.SUPABASE_URL, key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (url && key) {
    g.__otmStore = createSupabaseStore(url, key);
  } else if (process.env.NODE_ENV === 'production' && process.env.VERCEL) {
    throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in production.');
  } else {
    const file = path.join(process.cwd(), '.data', 'dev-store.json');
    console.warn(`[otm] Supabase not configured; using a local dev store at ${file}.`);
    g.__otmStore = createMemoryStore(readDevData(file), (d) => writeDevData(file, d));
  }
  return g.__otmStore;
}

function readDevData(file: string): Data {
  try {
    const j = JSON.parse(fs.readFileSync(file, 'utf8'));
    return { plays: new Map(j.plays), counts: new Map(j.counts), totals: new Map(j.totals) };
  } catch {
    return emptyData();
  }
}

function writeDevData(file: string, d: Data) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify({ plays: [...d.plays], counts: [...d.counts], totals: [...d.totals] }));
}
