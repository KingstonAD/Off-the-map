/* npm run check-flights — fails the build if any flight file breaks the rules in BUILD_SPEC. */
import fs from 'node:fs';
import path from 'node:path';
import { validateFlight, type Flight } from '@/lib/flight-types';
import { flightNumberFor } from '@/lib/time';

const dir = path.join(process.cwd(), 'data', 'flights');
const files = fs.readdirSync(dir).filter((f) => f.endsWith('.json')).sort();
let failed = 0;

for (const file of files) {
  const date = file.replace(/\.json$/, '');
  let flight: Flight;
  try {
    flight = JSON.parse(fs.readFileSync(path.join(dir, file), 'utf8'));
  } catch (e) {
    console.error(`✗ ${file}: invalid JSON (${(e as Error).message})`);
    failed++;
    continue;
  }
  const { errors, warnings } = validateFlight(flight, flightNumberFor(date));
  if (flight.date !== date) errors.push(`date field ${flight.date} doesn't match file name`);
  for (const w of warnings) console.warn(`  ! ${file}: ${w}`);
  if (errors.length) {
    failed++;
    for (const e of errors) console.error(`✗ ${file}: ${e}`);
  } else {
    console.log(`✓ ${file} — Flight #${flight.flight}, ${flight.stops.length} stops`);
  }
}

if (!files.length) { console.error('No flight files in data/flights.'); process.exit(1); }
if (failed) { console.error(`\n${failed} flight file(s) failed validation.`); process.exit(1); }
