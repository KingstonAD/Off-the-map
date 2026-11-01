/* Display units. Scoring and storage stay in km; miles are a display-only conversion. */

export type Unit = 'km' | 'mi';
export const KM_PER_MI = 1.609344;

export const isUnit = (u: unknown): u is Unit => u === 'km' || u === 'mi';

/** km → the chosen unit, unrounded. */
export function toUnit(km: number, unit: Unit): number {
  return unit === 'mi' ? km / KM_PER_MI : km;
}
