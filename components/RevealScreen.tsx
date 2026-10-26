'use client';
import { useEffect, useState } from 'react';
import { BoardingPass } from '@/components/BoardingPass';
import { PassportStamp, RedEyeBadge, Seal } from '@/components/PassportStamp';
import { SplitFlap } from '@/components/SplitFlap';
import { useCountUp, wrapBoard, type AnswerResp, type StartResp } from '@/lib/client';
import { prefersReducedMotion } from '@/lib/flap';
import { fmt, kmFor, pct, STOPS_PER_FLIGHT, tierFor, TIERS } from '@/lib/scoring';
import { stampDate } from '@/lib/time';

type Props = { r: AnswerResp; prompt: string; previous: StartResp['previous']; prevKm: number; onNext: () => void };

const pad2 = (n: number) => String(n).padStart(2, '0');

/** Answer reveal: the stamp slams, km counts up, a Red-Eye badge follows 450 ms later, then what the terminal said. */
export function RevealScreen({ r, prompt, previous, prevKm, onNext }: Props) {
  // 0 = nothing, 1 = stamp down (+shake), 2 = counting, 3 = Red-Eye badge
  const [stage, setStage] = useState(0);
  const [replay, setReplay] = useState(0);

  useEffect(() => {
    if (prefersReducedMotion()) { setStage(3); return; }
    setStage(0);
    const t = [setTimeout(() => setStage(1), 450), setTimeout(() => setStage(2), 830), setTimeout(() => setStage(3), 900)];
    return () => t.forEach(clearTimeout);
  }, [replay]);

  const earned = useCountUp(r.km, 900, 0, stage >= 2);
  const total = useCountUp(r.totalKm, 900, prevKm, stage >= 2);

  const n = r.stop + 1;
  const lost = r.tier === 'lost';
  const answer = r.name ?? 'No answer';
  const left = `0:${pad2(Math.max(0, Math.ceil(r.leftMs / 1000)))}`;
  const last = previous.filter((p) => p.name).at(-1);

  // Top 4, with your answer swapped into the last row if it isn't already there.
  const rows = r.top.slice(0, 4);
  if (r.yours && !rows.some((x) => x.id === r.yours!.id)) rows[rows.length - 1] = r.yours;
  const max = Math.max(...rows.map((x) => x.share), 0.0001);

  return (
    <main className={`otm-screen${stage >= 1 ? ' otm-shake' : ''}`} key={replay} style={{ gap: 12 }}>
      <div className="otm-topbar">
        <span className="otm-label amber">Stop {n}/{STOPS_PER_FLIGHT} · Stamped</span>
        <div style={{ textAlign: 'right' }}>
          <div className="otm-label">Travelled</div>
          <div className="otm-km"><span>{fmt(total)}</span> KM</div>
        </div>
      </div>

      <div className="otm-board" style={{ padding: '8px 8px 9px' }}>
        <SplitFlap lines={wrapBoard(prompt, 20)} cols={20} size="sm" mode="instant" label={prompt} />
      </div>

      <div
        className="otm-passport"
        style={{ height: 288, cursor: 'pointer' }}
        role="button"
        aria-label="Replay stamp"
        tabIndex={0}
        onClick={() => setReplay((x) => x + 1)}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setReplay((x) => x + 1); } }}
      >
        <div className="pp-head"><span>Passport · Page {pad2(n)}</span><span>Visas / Entries</span></div>
        {last && (
          <Seal tier={last.tier ?? 'lost'} rot={14} style={{ position: 'absolute', left: -14, bottom: -10, opacity: 0.28, width: 96, height: 96, fontSize: 15 }}>
            <span>{last.name}<small>Stop {last.stop + 1}</small></span>
          </Seal>
        )}
        <Seal tier="explorer" rot={-18} style={{ position: 'absolute', right: -8, bottom: 18, opacity: 0.22, width: 84, height: 84, fontSize: 13 }}>
          <span>Arrived<small>{stampDate(r.date)}</small></span>
        </Seal>
        <div style={{ position: 'absolute', inset: '30px 0 0', display: 'grid', placeItems: 'center' }}>
          <div style={{ position: 'relative' }}>
            <PassportStamp
              key={`s${replay}`}
              tier={r.tier}
              rot={[-7, 5, -4, 8, -9, 3, -6][r.stop % 7]}
              top={[`Stop ${pad2(n)}`, stampDate(r.date)]}
              answer={answer}
              left={`+${fmt(r.km)} km`}
              right={lost ? (r.timedOut ? 'Gate closed' : 'Not on the list') : `${pct(r.share ?? 0)} said it`}
              slam={stage >= 1}
              style={{ opacity: stage >= 1 ? undefined : 0 }}
            />
            {r.redEye && (
              <RedEyeBadge
                key={`b${replay}`}
                left={left}
                slam={stage >= 3}
                style={{ position: 'absolute', left: -34, top: -58, width: 78, height: 78, '--rot': '-12deg', opacity: stage >= 3 ? undefined : 0 } as React.CSSProperties}
              />
            )}
          </div>
        </div>
      </div>

      <div className="otm-kv" style={{ alignItems: 'center' }}>
        <div>
          <div className="otm-label">Distance earned</div>
          <div style={{ font: '800 40px/40px var(--font-flap)', color: 'var(--amber-500)', letterSpacing: '.02em' }}>+{fmt(earned)} KM</div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div className="otm-label">Players who said it</div>
          <div style={{ font: '700 28px/32px var(--font-flap)' }}>{lost ? '—' : pct(r.share ?? 0)}</div>
        </div>
      </div>

      {r.redEye && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', border: '1px dashed var(--tier-redeye-lit)', borderRadius: 'var(--radius-card)' }}>
          <span className="otm-redeye-pill">&#9200; Red-Eye</span>
          <span className="otm-note">Correct with {left} left. Badge only, no extra km.</span>
        </div>
      )}
      {lost && (
        <div className="t-lost" style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', border: '1px dashed var(--tier-lost-lit)', borderRadius: 'var(--radius-card)' }}>
          <span className="otm-note">
            {r.timedOut ? 'The gate closed before you stamped an answer.' : `${answer} isn’t a valid answer for this stop.`} Lost Luggage, 0 km.
          </span>
        </div>
      )}

      <div className="otm-panel" style={{ padding: '10px 12px' }}>
        <div className="otm-label" style={{ marginBottom: 8 }}>What the terminal said</div>
        {rows.map((d) => {
          const mine = d.id === r.entityId && !lost;
          return (
            <div key={d.id} className={TIERS[tierFor(d.share)].cls} style={{ display: 'flex', alignItems: 'center', gap: 10, height: 22 }}>
              <span className="otm-row-name" style={{ width: 112, color: mine ? 'var(--amber-500)' : 'var(--ink-100)' }} title={d.name}>{d.name}</span>
              <span className="otm-bar"><span style={{ width: `${(d.share / max) * 100}%` }} /></span>
              <span className="otm-data" style={{ width: 40, textAlign: 'right', color: 'var(--ink-300)' }}>{pct(d.share)}</span>
              <span className="otm-data" style={{ width: 50, textAlign: 'right' }}>{fmt(kmFor(d.share))}</span>
            </div>
          );
        })}
      </div>

      <BoardingPass
        slim
        amber={r.isLast}
        style={{ marginTop: 'auto' }}
        ariaLabel={r.isLast ? 'See your results' : 'Next stop'}
        small={r.isLast ? `Flight #${r.flight} · Landing` : `Stop ${n + 1} · Boarding`}
        strong={r.isLast ? 'Land →' : 'Next stop →'}
        stubLabel={r.isLast ? 'FLT' : 'STOP'}
        stubCode={r.isLast ? `#${r.flight}` : `${n + 1}/${STOPS_PER_FLIGHT}`}
        onClick={onNext}
      />
    </main>
  );
}
