/* npm run relaunch -- [--launch YYYY-MM-DD] [--reset --yes]

   --launch  Move Flight #1 to this date. Re-dates every flight file (flight N → launch + N − 1) and writes
             data/launch.json. Commit and deploy afterwards: flights ship with the build.
   --reset   Delete ALL play data: plays, answer counts and stop totals (every player's history and streaks).
             Uses Supabase when SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY are set (e.g. in .env.local),
             otherwise the local dev store in .data/. Needs --yes; without it, prints what it would do.

   Friends beta today:     npm run relaunch -- --launch 2026-10-26
   Public launch later:    npm run relaunch -- --launch 2026-11-10 --reset --yes                       */
import fs from 'node:fs';
import path from 'node:path';
import { createClient } from '@supabase/supabase-js';
import type { Flight } from '@/lib/flight-types';

const args = process.argv.slice(2);
const opt = (name: string) => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : undefined; };
const launch = opt('--launch');
const reset = args.includes('--reset');
const yes = args.includes('--yes');

if (!launch && !reset) {
  console.error('Nothing to do. Pass --launch YYYY-MM-DD and/or --reset --yes. See the top of scripts/relaunch.ts.');
  process.exit(1);
}
if (launch && !/^\d{4}-\d{2}-\d{2}$/.test(launch)) {
  console.error(`--launch must be YYYY-MM-DD, got "${launch}"`);
  process.exit(1);
}

const root = process.cwd();
const dir = path.join(root, 'data', 'flights');
const addDays = (date: string, n: number) =>
  new Date(Date.UTC(+date.slice(0, 4), +date.slice(5, 7) - 1, +date.slice(8, 10) + n)).toISOString().slice(0, 10);

if (launch) {
  const files = fs.readdirSync(dir).filter((f) => f.endsWith('.json'));
  const flights = files.map((f) => JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8')) as Flight).sort((a, b) => a.flight - b.flight);
  const numbers = new Set(flights.map((f) => f.flight));
  if (numbers.size !== flights.length) { console.error('Two flight files share a flight number; fix that first.'); process.exit(1); }

  // Read everything first, then rewrite, so renames can't collide.
  for (const f of files) fs.unlinkSync(path.join(dir, f));
  for (const f of flights) {
    const date = addDays(launch, f.flight - 1);
    console.log(`  Flight #${f.flight}: ${f.date} → ${date}`);
    f.date = date;
    fs.writeFileSync(path.join(dir, `${date}.json`), JSON.stringify(f, null, 2) + '\n');
  }
  fs.writeFileSync(path.join(root, 'data', 'launch.json'), JSON.stringify({ launch }) + '\n');
  console.log(`Launch date is now ${launch} (Flight #1). Run npm run check-flights, then commit and deploy.`);
}

if (reset) {
  const url = process.env.SUPABASE_URL, key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const target = url ? `Supabase project ${url}` : 'the local dev store (.data/dev-store.json)';
  if (!yes) {
    console.log(`\nWould DELETE all plays, answer counts and stop totals in ${target}.\nRe-run with --reset --yes to do it.`);
    process.exit(0);
  }
  if (url && key) {
    const db = createClient(url, key, { auth: { persistSession: false } });
    for (const table of ['plays', 'answer_counts', 'stop_totals', 'stops', 'flights']) {
      // Supabase refuses an unfiltered delete; this filter matches every row.
      const col = table === 'flights' ? 'number' : 'stop_index';
      const r = await db.from(table).delete().gte(col, -1);
      if (r.error) { console.error(`Failed to clear ${table}: ${r.error.message}`); process.exit(1); }
      console.log(`  cleared ${table}`);
    }
    console.log('Play data reset. Run npm run seed to reload the flights and stops tables (optional).');
  } else {
    fs.rmSync(path.join(root, '.data', 'dev-store.json'), { force: true });
    console.log('Local dev store reset.');
  }
}
