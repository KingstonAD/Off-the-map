'use client';
import { Seal } from '@/components/PassportStamp';
import { UnitToggle } from '@/components/UnitToggle';
import { useUnit } from '@/lib/client';
import { CIRCUMFERENCE, dist, kmFor, MAX_STOP } from '@/lib/scoring';

/** How to play: the distance scale and the tier table, in the player's unit. Thresholds are km under the hood. */
const SCALE: [number, string][] = [
  [1_000, 'Across the border'],
  [5_000, 'Across an ocean'],
  [20_000, 'The other side of the world'],
  [CIRCUMFERENCE, 'Full circle · every stop 1% or less'],
];
const ROTS = [-8, 6, -4, 9, 5, -10];

export function DistanceBriefing() {
  const [unit] = useUnit();
  const U = unit.toUpperCase();
  const d = (km: number) => dist(km, unit);
  const b25 = d(kmFor(0.25)), b10 = d(kmFor(0.1)), b3 = d(kmFor(0.03));
  const tierRows = [
    { t: 'tourist', l: 'T', name: 'Tourist', share: '25%+ said it', km: `up to ${b25}` },
    { t: 'backpacker', l: 'B', name: 'Backpacker', share: '10–25%', km: `${b25}–${b10}` },
    { t: 'explorer', l: 'E', name: 'Explorer', share: '3–10%', km: `${b10}–${b3}` },
    { t: 'uncharted', l: 'U', name: 'Uncharted', share: 'Under 3%', km: `${b3}–${d(MAX_STOP)}` },
    { t: 'lost', l: 'L', name: 'Lost Luggage', share: 'Wrong or gate closed', km: '0' },
    { t: 'redeye', l: 'R', name: 'Red-Eye badge', share: 'Correct in the last 3 seconds', km: `No ${unit}` },
  ] as const;

  return (
    <>
      <div>
        <div className="otm-kv" style={{ marginBottom: 8 }}>
          <span className="otm-label">Distance scale</span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span className="otm-label">Max {d(MAX_STOP)} {unit} / stop</span>
            <UnitToggle />
          </span>
        </div>
        <div style={{ position: 'relative', paddingLeft: 26 }}>
          <div style={{ position: 'absolute', left: 7, top: 10, bottom: 10, borderLeft: '2px dotted var(--amber-700)' }} />
          {SCALE.map(([km, means], i) => {
            const last = i === SCALE.length - 1;
            return (
              <div key={km} style={{ position: 'relative', display: 'flex', alignItems: 'baseline', gap: 12, height: 27 }}>
                <span style={{ position: 'absolute', left: -24, top: 5, width: last ? 14 : 10, height: last ? 14 : 10, marginLeft: last ? -2 : 0, borderRadius: '50%', background: last ? 'var(--amber-500)' : 'var(--terminal-900)', border: '2px solid var(--amber-500)', boxShadow: last ? '0 0 12px rgba(255,181,46,.6)' : undefined }} />
                <span style={{ font: '700 21px/1 var(--font-flap)', color: 'var(--amber-500)', width: 92, letterSpacing: '.03em' }}>{d(km)} {U}</span>
                <span style={{ font: '400 14px/1 var(--font-sans)', color: last ? 'var(--ink-100)' : 'var(--ink-300)' }}>{means}</span>
              </div>
            );
          })}
        </div>
      </div>

      <div className="otm-passport" style={{ paddingBottom: 9 }}>
        <div className="pp-head"><span>Stamp tier · share of players</span><span>{U} per stop</span></div>
        <div style={{ padding: '6px 12px 0' }}>
          {tierRows.map((t, i) => {
            const badge = t.t === 'redeye';
            return (
              <div key={t.t} style={{ display: 'flex', alignItems: 'center', gap: 10, height: 33, ...(badge ? { borderTop: '1px dashed var(--paper-200)', marginTop: 3, paddingTop: 3 } : {}) }}>
                <Seal tier={t.t} rot={ROTS[i]} style={{ width: 28, height: 28, fontSize: 14, lineHeight: '14px', boxShadow: 'inset 0 0 0 2px var(--paper-100),inset 0 0 0 3px currentColor', borderWidth: 2, borderStyle: badge ? 'dashed' : undefined }}>{t.l}</Seal>
                <b className={`t-${t.t}`} style={{ width: 118, font: '800 16px/1 var(--font-flap)', letterSpacing: '.04em', textTransform: 'uppercase', color: 'var(--ink)' }}>{t.name}</b>
                <span style={{ flex: 1, font: '400 12px/14px var(--font-sans)', color: 'var(--paper-muted)' }}>{t.share}</span>
                <span style={{ font: '600 11.5px/1 var(--font-mono)', color: 'var(--paper-ink)', whiteSpace: 'nowrap' }}>{t.km}</span>
              </div>
            );
          })}
        </div>
        <div style={{ margin: '8px 12px 0', paddingTop: 7, borderTop: '1px dashed var(--paper-200)', font: '600 9.5px/1 var(--font-mono)', letterSpacing: '.06em', color: 'var(--paper-muted)', textAlign: 'center' }}>
          {U} = {d(MAX_STOP)} × LOG(1/SHARE) ÷ LOG(100) · MAX {d(MAX_STOP)}
        </div>
      </div>
    </>
  );
}
