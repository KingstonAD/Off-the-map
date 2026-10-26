import { describe, expect, it } from 'vitest';
import { normalize, POOLS, search } from '@/lib/pools';

describe('pools', () => {
  it('lists every country and all 50 states', () => {
    expect(POOLS.country.length).toBe(197);
    expect(POOLS.us_state.length).toBe(50);
  });
  it('normalizes accents, case and punctuation', () => {
    expect(normalize('São Tomé and Príncipe')).toBe('sao tome and principe');
    expect(normalize('St. Lucia')).toBe('st lucia');
    expect(normalize('Côte d’Ivoire')).toBe('cote divoire');
  });
  it('ranks prefix matches before substring matches', () => {
    const r = search('country', 'ma').map((s) => s.entry.name);
    expect(r[0]).toBe('Madagascar');
    expect(r.every((n) => n.toLowerCase().startsWith('ma'))).toBe(true);
    expect(search('country', 'stan', 20).map((s) => s.entry.name)).toContain('Kyrgyzstan');
  });
  it('finds entries by alias, accent-insensitively', () => {
    expect(search('country', 'burma')[0]).toMatchObject({ entry: { id: 'MM' }, via: 'Burma' });
    expect(search('country', 'turkiye')[0].entry.id).toBe('TR');
    expect(search('country', 'sao tome')[0].entry.id).toBe('ST');
  });
  it('word-prefix matches multi-word names', () => {
    expect(search('us_state', 'dakota').map((s) => s.entry.id)).toEqual(['US-ND', 'US-SD']);
  });
});
