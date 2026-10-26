/* npm run priors [YYYY-MM-DD ...] — sets prior_i = sqrt(views_i) / Σ sqrt(views_j) for every answer of every stop,
   from the last 12 months of English Wikipedia page views. Writes the priors back into the flight file. */
import fs from 'node:fs';
import path from 'node:path';
import type { Flight } from '@/lib/flight-types';
import { poolEntry } from '@/lib/pools';

const dir = path.join(process.cwd(), 'data', 'flights');
const dates = process.argv.slice(2);
const files = dates.length ? dates.map((d) => `${d}.json`) : fs.readdirSync(dir).filter((f) => f.endsWith('.json'));
// Wikimedia asks for a descriptive User-Agent with contact info; set PRIORS_CONTACT to your site or email.
const UA = `OffTheMap-priors/1.0 (${process.env.PRIORS_CONTACT ?? 'https://github.com/wikimedia; daily geography game build script'})`;

// The last 12 complete months: e.g. run in Oct 2026 → Oct 2025 through Sep 2026.
const ymd = (d: Date) => d.toISOString().slice(0, 10).replace(/-/g, '');
const now = new Date();
const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 0)); // last day of previous month
const start = new Date(Date.UTC(now.getUTCFullYear() - 1, now.getUTCMonth(), 1));
const viewsCache = new Map<string, number>();

async function views(title: string): Promise<number> {
  if (viewsCache.has(title)) return viewsCache.get(title)!;
  const t = encodeURIComponent(title.replace(/ /g, '_'));
  const url = `https://wikimedia.org/api/rest_v1/metrics/pageviews/per-article/en.wikipedia/all-access/user/${t}/monthly/${ymd(start)}00/${ymd(end)}00`;
  let last = 0;
  for (let attempt = 0; attempt < 4; attempt++) {
    const res = await fetch(url, { headers: { 'user-agent': UA } });
    if (res.ok) {
      const j = (await res.json()) as { items: { views: number }[] };
      const v = j.items.reduce((a, x) => a + x.views, 0);
      viewsCache.set(title, v);
      return v;
    }
    if (res.status === 404) throw new Error(`No Wikipedia article "${title}" (set "wiki" on its pool entry)`);
    last = res.status;
    await new Promise((r) => setTimeout(r, 2000 * (attempt + 1)));
  }
  throw new Error(`Pageviews request failed for "${title}" (HTTP ${last})`);
}

for (const file of files) {
  const p = path.join(dir, file);
  const flight: Flight = JSON.parse(fs.readFileSync(p, 'utf8'));
  console.log(`Flight #${flight.flight} (${flight.date})`);
  for (const stop of flight.stops) {
    const titles = stop.answers.map((a) => { const e = poolEntry(stop.pool, a.id); return e?.wiki ?? e?.name ?? a.name; });
    const v: number[] = [];
    for (const t of titles) { v.push(await views(t)); await new Promise((r) => setTimeout(r, 120)); } // sequential: the API rate-limits bursts
    const roots = v.map((x) => Math.sqrt(Math.max(1, x)));
    const sum = roots.reduce((a, x) => a + x, 0);
    stop.answers.forEach((a, i) => { a.prior = +(roots[i] / sum).toFixed(5); });
    const top = [...stop.answers].sort((a, b) => b.prior! - a.prior!);
    console.log(`  ${stop.id}: ${top.slice(0, 3).map((a) => `${a.name} ${(a.prior! * 100).toFixed(1)}%`).join(', ')} … ${top.at(-1)!.name} ${(top.at(-1)!.prior! * 100).toFixed(1)}%`);
  }
  fs.writeFileSync(p, JSON.stringify(flight, null, 2) + '\n');
}
