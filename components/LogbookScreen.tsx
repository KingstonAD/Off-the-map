'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { SplitFlap } from '@/components/SplitFlap';
import { UnitToggle } from '@/components/UnitToggle';
import { api, useUnit, type LogbookResp } from '@/lib/client';
import { CIRCUMFERENCE, dist, TIERS, type Tier } from '@/lib/scoring';

const ORDER: Tier[] = ['tourist', 'backpacker', 'explorer', 'uncharted', 'lost'];

export function LogbookScreen() {
  const [l, setL] = useState<LogbookResp | null>(null);
  const [unit] = useUnit();
  useEffect(() => { api<LogbookResp>('/api/logbook').then(setL).catch(() => {}); }, []);

  const hist = ORDER.map((t) => [t, l?.tierCounts[t] ?? 0] as const);
  const stops = l?.stopsFlown ?? 0;
  const days = (n: number) => `${n} DAY${n === 1 ? '' : 'S'}`;

  return (
    <main className="otm-screen" style={{ gap: 14 }}>
      <div className="otm-topbar">
        <Link className="otm-icon-btn" aria-label="Back" href="/">&#8592;</Link>
        <span className="otm-label amber">Pilot logbook</span>
        <UnitToggle />
      </div>
      <h1 className="otm-title">Logbook</h1>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <div className="otm-panel">
          <div className="otm-label">Streak</div>
          <SplitFlap lines={[l ? days(l.streak) : '']} cols={7} size="sm" justify="start" style={{ marginTop: 8 }} label={l ? days(l.streak) : 'Streak'} />
          <div className="otm-label otm-sublabel" style={{ marginTop: 6 }}>Best: {l?.bestStreak ?? 0} day{l?.bestStreak === 1 ? '' : 's'}</div>
        </div>
        <div className="otm-panel">
          <div className="otm-label">Longest trip</div>
          <div className="otm-stat" style={{ color: 'var(--amber-500)' }}>{l?.longest ? dist(l.longest.km, unit) : '0'}<span style={{ fontSize: 16 }}> {unit.toUpperCase()}</span></div>
          <div className="otm-label otm-sublabel" style={{ marginTop: 4 }}>{l?.longest ? `Flight #${l.longest.flight}` : 'No flights yet'}</div>
        </div>
        <div className="otm-panel">
          <div className="otm-label">Circumnavigations</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 6 }}>
            <span className="otm-stat" style={{ marginTop: 0 }}>{l?.circumnavigations ?? 0}</span>
            <span style={{ width: 22, height: 22, borderRadius: '50%', border: '2px solid var(--amber-500)', boxShadow: l?.circumnavigations ? '0 0 10px rgba(255,181,46,.4)' : undefined, opacity: l?.circumnavigations ? 1 : 0.4 }} />
          </div>
          <div className="otm-label otm-sublabel" style={{ marginTop: 4 }}>
            {l?.lastCircumnavigation ? `All 7 Uncharted · #${l.lastCircumnavigation}` : 'All 7 Uncharted'}
          </div>
        </div>
        <div className="otm-panel">
          <div className="otm-label">Flights flown</div>
          <div className="otm-stat">{l?.flightsFlown ?? 0}</div>
          <div className="otm-label otm-sublabel" style={{ marginTop: 4 }}>Avg {dist(l?.avgKm ?? 0, unit)} {unit}</div>
        </div>
      </div>

      <div className="otm-panel">
        <div className="otm-kv" style={{ marginBottom: 10 }}>
          <span className="otm-label">Last 14 flights</span>
          <span className="otm-label">{unit}</span>
        </div>
        <div style={{ position: 'relative', height: 96, display: 'flex', alignItems: 'flex-end', gap: 5, borderBottom: '1px solid var(--terminal-600)' }}>
          <div style={{ position: 'absolute', left: 0, right: 0, top: 0, borderTop: '1px dashed var(--amber-700)' }} />
          <span className="otm-label amber" style={{ position: 'absolute', right: 0, top: -14, fontSize: 8.5 }}>{dist(CIRCUMFERENCE, unit)}</span>
          {(l?.last14 ?? []).map((f) => (
            <span
              key={f.flight}
              title={`Flight #${f.flight}: ${dist(f.km, unit)} ${unit}${f.complete ? '' : ' (incomplete)'}`}
              style={{ flex: '1 1 0', maxWidth: 22, height: `${Math.max(1, (f.km / CIRCUMFERENCE) * 100).toFixed(1)}%`, borderRadius: '2px 2px 0 0', background: f.today ? 'var(--amber-500)' : 'var(--amber-700)', boxShadow: f.today ? '0 0 10px rgba(255,181,46,.45)' : undefined, opacity: f.complete ? 1 : 0.5 }}
            />
          ))}
          {l && !l.last14.length && <span className="otm-note" style={{ alignSelf: 'center', margin: '0 auto' }}>No flights logged yet.</span>}
        </div>
        <div className="otm-kv" style={{ marginTop: 6 }}>
          <span className="otm-label">{l?.last14.length ? `#${l.last14[0].flight}` : ''}</span>
          <span className="otm-label">{l?.last14.length ? `#${l.last14.at(-1)!.flight}` : ''}</span>
        </div>
      </div>

      <div className="otm-panel">
        <div className="otm-kv" style={{ marginBottom: 10 }}><span className="otm-label">Tier history</span><span className="otm-label">{stops} stop{stops === 1 ? '' : 's'}</span></div>
        <div style={{ display: 'flex', height: 16, borderRadius: 3, overflow: 'hidden', gap: 2, background: stops ? undefined : 'var(--terminal-700)' }} role="img" aria-label={hist.map(([t, n]) => `${TIERS[t].name} ${n}`).join(', ')}>
          {hist.filter(([, n]) => n > 0).map(([t, n]) => <span key={t} className={TIERS[t].cls} style={{ flex: n, background: 'var(--lit)' }} />)}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 7, marginTop: 12 }}>
          {hist.map(([t, n]) => (
            <div key={t} className={TIERS[t].cls} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ width: 10, height: 10, borderRadius: 2, background: 'var(--lit)' }} />
              <span style={{ flex: 1, font: '700 15px/1 var(--font-flap)', letterSpacing: '.05em', textTransform: 'uppercase' }}>{TIERS[t].name}</span>
              <span className="otm-data" style={{ color: 'var(--ink-300)' }}>{n}<span style={{ opacity: 0.7 }}> · {stops ? Math.round((n / stops) * 100) : 0}%</span></span>
            </div>
          ))}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 10, paddingTop: 9, borderTop: '1px dashed var(--terminal-600)' }}>
          <span className="otm-redeye-pill">&#9200; Red-Eye</span>
          <span style={{ flex: 1, font: '400 12px/1 var(--font-sans)', color: 'var(--ink-300)' }}>Badges · last-3-second saves</span>
          <span className="otm-data">{l?.redEyes ?? 0}</span>
        </div>
      </div>
    </main>
  );
}
