import { describe, expect, it } from 'vitest';
import { blendShare, distancePhrase, judgeTiming, kmFor, pct, shareText, tierFor, type StopScore } from '@/lib/scoring';

describe('kmFor', () => {
  it('matches the spec values', () => {
    expect(Math.abs(kmFor(0.40) - 1139)).toBeLessThanOrEqual(1);
    expect(kmFor(0.05)).toBe(3724);
    expect(kmFor(0.02)).toBe(4863);
    expect(kmFor(0.01)).toBe(5725);
    expect(kmFor(0.001)).toBe(5725);
  });
  it('gives 0 km at 100% and the tier boundaries from the brand book', () => {
    expect(kmFor(1)).toBe(0);
    expect(kmFor(0.25)).toBe(1723);
    expect(kmFor(0.10)).toBe(2863); // 2,862.5 rounds up
    expect(kmFor(0.03)).toBe(4359);
  });
  it('7 capped stops is the circumference', () => {
    expect(kmFor(0.01) * 7).toBe(40075);
  });
});

describe('tierFor', () => {
  it('takes the higher-share tier on a boundary', () => {
    expect(tierFor(0.25)).toBe('tourist');
    expect(tierFor(0.10)).toBe('backpacker');
    expect(tierFor(0.03)).toBe('explorer');
  });
  it('drops a tier just under each boundary', () => {
    expect(tierFor(0.2499)).toBe('backpacker');
    expect(tierFor(0.0999)).toBe('explorer');
    expect(tierFor(0.0299)).toBe('uncharted');
  });
});

describe('blendShare', () => {
  it('is ~99.5% prior with 1 correct answer', () => {
    // crowd = 1 (the only answer), prior = 0.1; recover the weight on the prior
    const s = blendShare(1, 1, 0.1);
    const crowdWeight = (s - 0.1) / (1 - 0.1);
    expect(1 - crowdWeight).toBeCloseTo(0.995, 3);
  });
  it('is ~91% crowd with 2,000 correct answers', () => {
    const s = blendShare(400, 2000, 0.05); // crowd = 0.2
    const crowdWeight = (s - 0.05) / (0.2 - 0.05);
    expect(crowdWeight).toBeCloseTo(0.909, 3);
  });
  it('falls back to the prior with no answers', () => {
    expect(blendShare(0, 0, 0.07)).toBe(0.07);
  });
});

describe('judgeTiming', () => {
  const t0 = 1_000_000;
  it('accepts up to 20 s + 1.5 s grace and rejects after', () => {
    expect(judgeTiming(t0, t0 + 21_500).late).toBe(false);
    expect(judgeTiming(t0, t0 + 21_501).late).toBe(true);
    expect(judgeTiming(t0, t0 + 30_000).late).toBe(true);
  });
  it('awards Red-Eye at 3.0 s left, not at 3.1 s', () => {
    expect(judgeTiming(t0, t0 + 17_000).redEyeWindow).toBe(true); // 3.0 s left
    expect(judgeTiming(t0, t0 + 16_900).redEyeWindow).toBe(false); // 3.1 s left
  });
});

describe('copy helpers', () => {
  const s = (tier: StopScore['tier'], km: number, redEye = false): StopScore => ({ tier, km, redEye });
  it('distance phrase follows the spec table', () => {
    expect(distancePhrase(999, [])).toBe('Still on the runway');
    expect(distancePhrase(1000, [])).toBe('Across the border');
    expect(distancePhrase(5000, [])).toBe('Across an ocean');
    expect(distancePhrase(18000, [])).toBe('Across an ocean');
    expect(distancePhrase(20000, [])).toBe('The other side of the world');
    expect(distancePhrase(31000, Array(7).fill(s('uncharted', 4428)))).toBe('Circumnavigation');
  });
  it('share text has no prompts or answers, and a Red-Eye line only when earned', () => {
    const stops = [s('tourist', 1139), s('backpacker', 2000), s('explorer', 3724, true), s('uncharted', 4863), s('explorer', 3000), s('backpacker', 1875), s('lost', 0)];
    expect(shareText(1, stops, 'example.com')).toBe('Off the Map #1 ✈️ 16,601 km\n⬜🟩🟦🟪🟦🟩⬛\n⏰ Red-Eye ×1\nBon voyage. No spoilers.\nexample.com');
    expect(shareText(2, stops.map((x) => ({ ...x, redEye: false })), '')).not.toContain('Red-Eye');
  });
  it('formats shares', () => {
    expect(pct(0.31)).toBe('31%');
    expect(pct(0.004)).toBe('0.4%');
    expect(pct(0.0004)).toBe('<0.1%');
  });
});
