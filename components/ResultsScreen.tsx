'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { BoardingPass } from '@/components/BoardingPass';
import { Seal } from '@/components/PassportStamp';
import { RouteGlobe } from '@/components/RouteGlobe';
import { ShareSheet } from '@/components/ShareSheet';
import { SplitFlap } from '@/components/SplitFlap';
import { api, ApiError, type ResultsResp } from '@/lib/client';
import { distancePhrase, fmt, pct, TIERS } from '@/lib/scoring';

const fmtKm = (n: number) => `${fmt(n)} KM`.padStart(9, ' ');

export function ResultsScreen() {
  const router = useRouter();
  const [r, setR] = useState<ResultsResp | null>(null);
  const [km, setKm] = useState(0);
  const [landed, setLanded] = useState(false);
  const [replay, setReplay] = useState(0);
  const [sharing, setSharing] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    api<ResultsResp>('/api/results/today')
      .then((x) => (x.complete ? setR(x) : router.replace('/play')))
      .catch((e) => (e instanceof ApiError && e.status === 404 ? router.replace('/') : setFailed(true)));
  }, [router]);

  if (!r) {
    return (
      <main className="otm-screen">
        <div className="otm-center"><span className="otm-label">{failed ? 'The arrivals board is down. Refresh to try again.' : 'Taxiing to the gate…'}</span></div>
      </main>
    );
  }

  const phrase = landed
    ? r.circumnavigation ? 'Circumnavigation · all 7 Uncharted' : r.phrase
    : km < 1000 ? 'Taxiing…' : distancePhrase(km, []);

  return (
    <main className="otm-screen" style={{ gap: 10 }}>
      <div className="otm-topbar">
        <Link className="otm-icon-btn" aria-label="Home" href="/">&#8592;</Link>
        <span className="otm-label amber">Flight #{r.flight} · Landed</span>
        <Link className="otm-icon-btn" aria-label="Logbook" href="/logbook">&#9636;</Link>
      </div>

      <div
        style={{ position: 'relative', height: 212, display: 'grid', placeItems: 'center', cursor: 'pointer' }}
        role="button"
        tabIndex={0}
        aria-label="Replay route"
        onClick={() => { setLanded(false); setReplay((x) => x + 1); }}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setLanded(false); setReplay((x) => x + 1); } }}
      >
        <RouteGlobe
          stops={r.stops.map((s) => ({ km: s.km, tier: s.tier }))}
          total={r.totalKm}
          replay={replay}
          onFrame={(k, done) => { setKm(k); if (done) setLanded(true); }}
        />
      </div>

      <div style={{ textAlign: 'center' }}>
        <SplitFlap lines={[fmtKm(landed ? r.totalKm : km)]} cols={9} size="xl" mode={landed ? 'direct' : 'instant'} label={`${fmt(r.totalKm)} km`} />
        <div className="otm-label" style={{ marginTop: 8 }}>{phrase}</div>
      </div>

      <div className="otm-panel" style={{ padding: '6px 12px' }}>
        {r.stops.map((st, i) => {
          const t = TIERS[st.tier ?? 'lost'];
          const timedOut = st.tier === 'lost' && !st.name;
          return (
            <div key={i} className={t.cls} style={{ display: 'flex', alignItems: 'center', gap: 10, height: 27, borderTop: i ? '1px dashed var(--terminal-600)' : undefined }}>
              <span className="otm-data" style={{ width: 18, color: 'var(--ink-300)' }}>{i + 1}</span>
              <span style={{ position: 'relative', width: 12, height: 12, borderRadius: 2, background: 'var(--lit)', flex: 'none' }}>
                {st.redEye && <span title="Red-Eye badge" style={{ position: 'absolute', right: -4, top: -4, width: 7, height: 7, borderRadius: '50%', background: 'var(--tier-redeye-lit)', boxShadow: '0 0 0 1.5px var(--terminal-800)' }} />}
              </span>
              <span
                className="otm-row-name"
                style={{ flex: 1, fontSize: 16, color: st.tier === 'lost' ? 'var(--ink-300)' : 'var(--ink-100)', textDecoration: st.tier === 'lost' && st.name ? 'line-through' : undefined }}
              >
                {timedOut ? '— gate closed' : st.name}
              </span>
              <span style={{ font: '600 9.5px/1 var(--font-mono)', letterSpacing: '.12em', textTransform: 'uppercase', color: 'var(--lit)', width: 86 }}>
                {t.name}{st.redEye && <><br /><span style={{ color: 'var(--tier-redeye-lit)' }}>+ Red-Eye</span></>}
              </span>
              <span className="otm-data" style={{ width: 52, textAlign: 'right' }}>{fmt(st.km)}</span>
            </div>
          );
        })}
      </div>

      <div className="otm-passport" style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px' }}>
        {r.best ? (
          <>
            <Seal tier={r.best.tier!} rot={-10} style={{ width: 54, height: 54, fontSize: 11, lineHeight: '11px' }}>
              <span>{pct(r.best.share ?? 0)}<small>said it</small></span>
            </Seal>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="otm-card-k" style={{ fontSize: 9.5, letterSpacing: '.16em' }}>BEST ANSWER OF THE DAY</div>
              <div style={{ font: '800 24px/26px var(--font-flap)', textTransform: 'uppercase', letterSpacing: '.04em', marginTop: 3 }}>{r.best.name}</div>
              <div style={{ font: '400 12px/14px var(--font-sans)', color: 'var(--paper-muted)' }}>
                {r.best.prompt} · {TIERS[r.best.tier!].name} · {fmt(r.best.km)} km
              </div>
            </div>
          </>
        ) : (
          <>
            <Seal tier="lost" rot={-10} style={{ width: 54, height: 54, fontSize: 11, lineHeight: '11px' }}><span>0<small>km</small></span></Seal>
            <div style={{ flex: 1 }}>
              <div className="otm-card-k" style={{ fontSize: 9.5, letterSpacing: '.16em' }}>ALL BAGS LOST</div>
              <div style={{ font: '400 13px/17px var(--font-sans)', color: 'var(--paper-muted)', marginTop: 4 }}>No stamps this time. A new flight boards at 12 AM ET.</div>
            </div>
          </>
        )}
      </div>

      <BoardingPass
        amber
        slim
        style={{ marginTop: 'auto' }}
        ariaLabel="Share your flight"
        small="No spoilers in the card"
        strong="Share flight ↗"
        stubLabel="FLT"
        stubCode={`#${r.flight}`}
        onClick={() => setSharing(true)}
      />
      {sharing && <ShareSheet r={r} onClose={() => setSharing(false)} />}
    </main>
  );
}
