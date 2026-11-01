'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AnswerInput } from '@/components/AnswerInput';
import { GateTimer } from '@/components/GateTimer';
import { RevealScreen } from '@/components/RevealScreen';
import { SplitFlap } from '@/components/SplitFlap';
import { api, ApiError, useUnit, type AnswerResp, type StartResp, type TodayResp } from '@/lib/client';
import type { PoolEntry, PoolName } from '@/lib/pools';
import { dist, STOPS_PER_FLIGHT, type Tier } from '@/lib/scoring';

type Phase = 'loading' | 'boarding' | 'submitting' | 'reveal' | 'error';

export function PlayScreen() {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>('loading');
  const [unit] = useUnit();
  const [stop, setStop] = useState<StartResp | null>(null);
  const [reveal, setReveal] = useState<AnswerResp | null>(null);
  const [tiers, setTiers] = useState<(Tier | null)[]>(Array(STOPS_PER_FLIGHT).fill(null));
  const [gateLabel, setGateLabel] = useState('Gate closing');
  const [error, setError] = useState('');
  const busy = useRef(false);

  const start = useCallback(async (i: number) => {
    setPhase('loading');
    try {
      const s = await api<StartResp>('/api/stop/start', { stop: i });
      setStop(s);
      setReveal(null);
      setGateLabel('Gate closing');
      setPhase('boarding');
      busy.current = false;
    } catch (e) {
      if (e instanceof ApiError && (e.code === 'wrong_stop' || e.code === 'flight_complete')) return boot();
      setError('The board lost connection. Try again.');
      setPhase('error');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const boot = useCallback(async () => {
    try {
      const t = await api<TodayResp>('/api/flight/today');
      if (!t.progress) return router.replace('/');
      if (t.progress.complete) return router.replace('/results');
      setTiers(t.progress.tiers);
      await start(t.progress.nextStop!);
    } catch {
      setError('The board lost connection. Try again.');
      setPhase('error');
    }
  }, [router, start]);

  useEffect(() => { void boot(); }, [boot]);

  const submit = useCallback(async (entityId: string | null) => {
    if (!stop || busy.current) return;
    busy.current = true;
    setPhase('submitting');
    setGateLabel(entityId ? 'Stamping…' : 'Gate closed · Lost Luggage');
    try {
      const r = await api<AnswerResp>('/api/stop/answer', { stop: stop.stop, entityId });
      setTiers((t) => t.map((x, i) => (i === r.stop ? r.tier : x)));
      if (!entityId) await new Promise((res) => setTimeout(res, 900)); // let "gate closed" land
      setReveal(r);
      setPhase('reveal');
    } catch {
      busy.current = false;
      setError('Your answer didn’t reach the gate. Try again.');
      setPhase('error');
    }
  }, [stop]);

  const leave = () => {
    if (phase === 'boarding' && !window.confirm('Leave the flight? The gate keeps closing while you’re away.')) return;
    router.push('/');
  };

  if (phase === 'reveal' && reveal && stop) {
    return <RevealScreen r={reveal} prompt={stop.prompt} previous={stop.previous} prevKm={stop.totalKm} onNext={() => (reveal.isLast ? router.push('/results') : start(reveal.stop + 1))} />;
  }

  const n = stop ? stop.stop + 1 : 1;
  return (
    <main className="otm-screen fit" style={{ gap: 12, paddingBottom: 16 }}>
      <div className="otm-topbar">
        <button className="otm-icon-btn" aria-label="Leave flight" onClick={leave}>&#10005;</button>
        <div style={{ textAlign: 'center' }}>
          <div className="otm-label">Stop</div>
          <div className="otm-big">{n}<span style={{ color: 'var(--ink-300)' }}>/{STOPS_PER_FLIGHT}</span></div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div className="otm-label">Travelled</div>
          <div className="otm-km">{dist(stop?.totalKm ?? 0, unit)} {unit.toUpperCase()}</div>
        </div>
      </div>
      <div className="otm-pip" aria-hidden="true">
        {tiers.map((t, i) => <span key={i} className={i === n - 1 ? 'now' : t ? 'done' : ''} />)}
      </div>

      <div className="otm-board">
        <div className="otm-board-head">
          <span className="otm-label amber">Destination</span>
          <span className="otm-label amber">{stop?.category ?? ''}</span>
        </div>
        <SplitFlap lines={stop ? stop.board : ['', '', '']} rows={3} cols={14} label={stop?.prompt ?? 'Boarding'} />
      </div>

      {phase === 'error' ? (
        <div className="otm-panel" role="alert" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
          <span className="otm-note">{error}</span>
          <button className="otm-ghost" onClick={() => { setPhase('loading'); void boot(); }}>Retry</button>
        </div>
      ) : (
        <>
          <GateTimer
            key={stop ? `${stop.stop}` : 'none'}
            remainingMs={stop?.remainingMs ?? 20_000}
            running={phase === 'boarding'}
            label={gateLabel}
            onEnd={() => submit(null)}
          />
          {stop && (
            <AnswerInput
              key={stop.stop}
              pool={stop.pool as PoolName}
              disabled={phase !== 'boarding'}
              onPick={(e: PoolEntry) => submit(e.id)}
            />
          )}
        </>
      )}
    </main>
  );
}
