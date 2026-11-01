'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { BoardingPass } from '@/components/BoardingPass';
import { LuggageTag } from '@/components/LuggageTag';
import { SplitFlap } from '@/components/SplitFlap';
import { api, type TodayResp } from '@/lib/client';
import { STOPS_PER_FLIGHT } from '@/lib/scoring';
import { addDays, boardDate, hms, longDate, secsToNextFlight } from '@/lib/time';

const flt = (n: number) => `FLT ${String(n).padStart(3, '0')}`;

export function HomeScreen() {
  const [t, setT] = useState<TodayResp | null>(null);
  const [secs, setSecs] = useState<number | null>(null);
  const [showMap, setShowMap] = useState(false);

  useEffect(() => {
    const load = () => api<TodayResp>('/api/flight/today').then(setT).catch(() => {});
    void load();
    const s = setTimeout(() => setShowMap(true), 260);
    let last = secsToNextFlight();
    setSecs(last);
    const i = setInterval(() => {
      const now = secsToNextFlight();
      if (now > last) void load(); // midnight ET passed: a new flight just unlocked
      last = now;
      setSecs(now);
    }, 1000);
    return () => { clearTimeout(s); clearInterval(i); };
  }, []);

  const p = t?.progress ?? null;
  const preLaunch = !!t && t.date < t.launch;
  const status = !p ? null : p.complete ? 'LANDED' : p.answered ? 'IN FLIGHT' : 'BOARDING';

  // Departures: today's flight (if any), then the next scheduled ones.
  const rows: string[] = [];
  if (t) {
    if (p && status) rows.push(`${flt(p.flight)}  ${status}`);
    const sched = preLaunch
      ? [0, 1, 2].map((n) => ({ flight: n + 1, date: addDays(t.launch, n) }))
      : t.upcoming;
    for (const u of sched) if (rows.length < 3 && u.flight >= 1) rows.push(`${flt(u.flight)}  ${boardDate(u.date)}`);
  }
  const lit = p && status ? 1 : 0;

  let pass: React.ReactNode;
  if (!t) {
    pass = <BoardingPass amber small="Checking the board…" strong="Boarding…" stubLabel="SEAT" stubCode="1A" barcode disabled />;
  } else if (p && !p.complete) {
    const resume = p.answered > 0;
    pass = (
      <BoardingPass
        amber
        href="/play"
        ariaLabel={`${resume ? 'Resume' : 'Board now'}: Flight number ${p.flight}`}
        small={resume ? `Flight #${p.flight} · Stop ${p.answered + 1} of ${p.stops}` : `Flight #${p.flight} · ${p.stops} stops · 20s each`}
        strong={resume ? 'Resume →' : 'Board now →'}
        stubLabel="SEAT"
        stubCode="1A"
        barcode
      />
    );
  } else if (p?.complete) {
    pass = <BoardingPass amber href="/results" ariaLabel={`Flight number ${p.flight} landed: see results`} small={`Flight #${p.flight} · Landed`} strong="Results →" stubLabel="FLT" stubCode={`#${p.flight}`} barcode />;
  } else {
    pass = (
      <BoardingPass
        amber
        disabled
        small={preLaunch ? `Flight #1 · ${STOPS_PER_FLIGHT} stops · 20s each` : 'No flight scheduled today'}
        strong={preLaunch ? 'Boarding soon' : 'Grounded'}
        stubLabel="SEAT"
        stubCode="1A"
        barcode
      />
    );
  }

  const streak = t?.streak ?? 0;

  return (
    <main className="otm-screen" style={{ gap: 18 }}>
      <div className="otm-topbar">
        <span className="otm-label amber">Terminal OTM · Gate 1</span>
        <Link className="otm-icon-btn" aria-label="Logbook" title="Logbook" href="/logbook">&#9636;</Link>
      </div>

      <div style={{ textAlign: 'center', marginTop: 18 }}>
        <div className="otm-label" style={{ marginBottom: 12 }}>Daily geography departures</div>
        <h1 style={{ margin: 0, display: 'flex', flexDirection: 'column', alignItems: 'center' }} aria-label="Off the Map">
          <SplitFlap lines={['OFF THE']} cols={7} size="xl" label="Off the" />
          <SplitFlap lines={[showMap ? 'MAP' : '']} cols={3} size="xl" label="Map" style={{ marginTop: 4 }} />
        </h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, justifyContent: 'center', marginTop: 14 }}>
          <span style={{ height: 1, width: 40, background: 'var(--terminal-600)' }} />
          <span className="otm-label">Don’t be a tourist.</span>
          <span style={{ height: 1, width: 40, background: 'var(--terminal-600)' }} />
        </div>
      </div>

      <div className="otm-board" style={{ marginTop: 6 }}>
        <div className="otm-board-head"><span className="otm-label amber">Departures</span><span className="otm-label amber">Status</span></div>
        <SplitFlap lines={rows.length ? rows : ['', '', '']} rows={3} cols={19} size="sm" dimRows={[0, 1, 2].filter((i) => i >= lit)} label={rows.join(', ') || 'Departures'} />
        <div className="otm-dots" style={{ margin: '10px 0 8px' }} />
        <div className="otm-kv"><span className="otm-label">{t ? longDate(t.date) : ' '}</span><span className="otm-label">Departs 12 AM ET</span></div>
      </div>

      {pass}

      <div style={{ display: 'flex', gap: 12, alignItems: 'stretch' }}>
        <div className="otm-panel" style={{ flex: 1, padding: '10px 12px' }}>
          <div className="otm-label" style={{ marginBottom: 8 }}>{preLaunch ? 'Flight #1 boards in' : 'Next flight in'}</div>
          <SplitFlap lines={[secs === null ? '' : hms(secs)]} cols={8} size="sm" mode="direct" justify="start" label={secs === null ? 'Countdown' : `${hms(secs)} until the next flight`} />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', paddingLeft: 18 }}>
          <LuggageTag href="/logbook" label="Streak" value={`${streak} day${streak === 1 ? '' : 's'}`} amber={streak > 0 && streak >= (t?.bestStreak ?? 0) && streak > 1} />
        </div>
      </div>

      <nav style={{ marginTop: 'auto', display: 'flex', justifyContent: 'center', gap: 10 }}>
        <Link className="otm-ghost bare" href="/how-to-play">How to play</Link>
        <Link className="otm-ghost bare" href="/yesterday">Yesterday</Link>
        <Link className="otm-ghost bare" href="/logbook">Logbook</Link>
      </nav>
    </main>
  );
}
