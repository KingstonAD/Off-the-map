/* npm run seed — mirrors data/flights/*.json into the Supabase flights and stops tables (for SQL reporting). */
import fs from 'node:fs';
import path from 'node:path';
import { createClient } from '@supabase/supabase-js';
import type { Flight } from '@/lib/flight-types';

const url = process.env.SUPABASE_URL, key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) { console.error('Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (e.g. in .env.local) first.'); process.exit(1); }
const db = createClient(url, key, { auth: { persistSession: false } });
const dir = path.join(process.cwd(), 'data', 'flights');

for (const file of fs.readdirSync(dir).filter((f) => f.endsWith('.json')).sort()) {
  const f: Flight = JSON.parse(fs.readFileSync(path.join(dir, file), 'utf8'));
  let r = await db.from('flights').upsert({ date: f.date, number: f.flight });
  if (r.error) throw new Error(r.error.message);
  r = await db.from('stops').upsert(f.stops.map((s, i) => ({
    flight_date: f.date, stop_index: i, stop_id: s.id, prompt: s.prompt, board: s.board,
    category: s.category, pool: s.pool, notes: s.notes ?? null, answers: s.answers,
  })));
  if (r.error) throw new Error(r.error.message);
  console.log(`Seeded Flight #${f.flight} (${f.date})`);
}
