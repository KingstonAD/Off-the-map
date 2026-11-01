import { describe, expect, it } from 'vitest';
import { editDistance, normalize, POOLS, resolve, typoAllowance } from '@/lib/pools';

const names = (r: ReturnType<typeof resolve>) => (r.kind === 'close' ? r.options.map((o) => o.name) : []);

describe('pools', () => {
  it('lists every country and all 50 states', () => {
    expect(POOLS.country.length).toBe(197);
    expect(POOLS.us_state.length).toBe(50);
  });
  it('normalizes accents, case, punctuation and a leading "the"', () => {
    expect(normalize('São Tomé and Príncipe')).toBe('sao tome and principe');
    expect(normalize('St. Lucia')).toBe('st lucia');
    expect(normalize('Côte d’Ivoire')).toBe('cote divoire');
    expect(normalize('  THE Gambia ')).toBe('gambia');
    expect(normalize('Trinidad & Tobago')).toBe('trinidad and tobago');
    expect(normalize('Netherlands, The')).toBe('netherlands the');
  });
  it('counts an adjacent swap as one edit', () => {
    expect(editDistance('chad', 'chda')).toBe(1);
    expect(editDistance('peru', 'peru')).toBe(0);
    expect(editDistance('kitten', 'sitting')).toBe(3);
  });
  it('allows 1, 2 or 3 typos by name length', () => {
    expect(typoAllowance('chad')).toBe(1);
    expect(typoAllowance('mongolia')).toBe(2);
    expect(typoAllowance('philippines')).toBe(3);
  });
});

describe('resolve', () => {
  it('accepts exact names and aliases from the whole pool', () => {
    expect(resolve('country', 'The Gambia')).toMatchObject({ kind: 'exact', entry: { name: 'Gambia' } });
    expect(resolve('country', 'burma')).toMatchObject({ kind: 'exact', entry: { id: 'MM' } });
    expect(resolve('country', 'TURKIYE')).toMatchObject({ kind: 'exact', entry: { id: 'TR' } });
    expect(resolve('country', 'sao tome & principe')).toMatchObject({ kind: 'exact', entry: { id: 'ST' } });
    expect(resolve('country', 'cote d ivoire')).toMatchObject({ kind: 'exact', entry: { id: 'CI' } });
    expect(resolve('us_state', 'new york')).toMatchObject({ kind: 'exact', entry: { id: 'US-NY' } });
  });
  it('offers the closest name for a typo, scaled to name length', () => {
    expect(names(resolve('country', 'chda'))).toEqual(['Chad']);
    expect(names(resolve('country', 'mongolai'))).toEqual(['Mongolia']);
    expect(names(resolve('country', 'phillipines'))).toEqual(['Philippines']);
    expect(names(resolve('us_state', 'massachusets'))).toEqual(['Massachusetts']);
  });
  it('offers two names when both are close', () => {
    expect(names(resolve('country', 'ira'))).toEqual(['Iran', 'Iraq']);
  });
  it('gives up on text that is nowhere near the pool', () => {
    expect(resolve('country', 'xyz')).toEqual({ kind: 'unknown' });
    expect(resolve('country', 'chdi')).toEqual({ kind: 'unknown' }); // 2 edits from Chad is too many for a short name
    expect(resolve('country', '   ')).toEqual({ kind: 'unknown' });
    expect(resolve('us_state', 'france')).toEqual({ kind: 'unknown' });
  });
  it('searches only the stop’s pool', () => {
    expect(resolve('us_state', 'georgia')).toMatchObject({ kind: 'exact', entry: { id: 'US-GA' } });
    expect(resolve('country', 'georgia')).toMatchObject({ kind: 'exact', entry: { id: 'GE' } });
  });
});
