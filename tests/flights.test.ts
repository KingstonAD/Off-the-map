import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import { LAUNCH_DATE } from '@/lib/time';
import { validateFlight, type Flight } from '@/lib/flight-types';

const launch: Flight = JSON.parse(fs.readFileSync(`data/flights/${LAUNCH_DATE}.json`, 'utf8'));
const clone = (): Flight => JSON.parse(JSON.stringify(launch));

describe('validateFlight', () => {
  it('passes Flight #1', () => {
    expect(validateFlight(launch, 1).errors).toEqual([]);
  });
  it('fails a stop with fewer than 8 answers', () => {
    const f = clone();
    f.stops[0].answers = f.stops[0].answers.slice(0, 7);
    expect(validateFlight(f).errors.join()).toMatch(/only 7 valid answers/);
  });
  it('fails long or extra board lines', () => {
    const f = clone();
    f.stops[1].board = ['FIFTEEN CHARS!!'];
    expect(validateFlight(f).errors.join()).toMatch(/max 14/);
    f.stops[1].board = ['A', 'B', 'C', 'D'];
    expect(validateFlight(f).errors.join()).toMatch(/4 lines/);
  });
  it('fails ids outside the pool and repeated ids', () => {
    const f = clone();
    f.stops[5].answers.push({ id: 'CA', name: 'Canada' });
    expect(validateFlight(f).errors.join()).toMatch(/not in pool "us_state"/);
    const g = clone();
    g.stops[2].answers.push({ id: 'EC', name: 'Ecuador' });
    expect(validateFlight(g).errors.join()).toMatch(/EC repeated/);
  });
});
