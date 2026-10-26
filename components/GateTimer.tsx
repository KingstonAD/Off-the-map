'use client';
import { useEffect, useRef, useState } from 'react';
import { GATE_MS, RED_EYE_MS } from '@/lib/scoring';

type Props = {
  /** Time left when this gate started running (from the server). */
  remainingMs: number;
  running: boolean;
  label: string;
  onEnd?: () => void;
};

/** Two hatched doors slide shut over the amber opening. Turns gate-red and pulses at 3 seconds.
    Screen readers hear only "3 seconds" and "Gate closed". */
export function GateTimer({ remainingMs, running, label, onEnd }: Props) {
  const el = useRef<HTMLDivElement>(null);
  const time = useRef<HTMLSpanElement>(null);
  const endRef = useRef(onEnd);
  endRef.current = onEnd;
  const [announce, setAnnounce] = useState('');

  useEffect(() => {
    const g = el.current!, tEl = time.current!;
    const paint = (leftMs: number) => {
      g.style.setProperty('--frac', (leftMs / GATE_MS).toFixed(4));
      tEl.textContent = '0:' + String(Math.ceil(leftMs / 1000)).padStart(2, '0');
      g.classList.toggle('final', leftMs <= RED_EYE_MS && leftMs > 0 && running);
    };
    paint(remainingMs);
    if (!running) return;
    setAnnounce('');
    const t0 = performance.now();
    let raf = 0, warned = remainingMs <= RED_EYE_MS;
    const frame = (now: number) => {
      const left = Math.max(0, remainingMs - (now - t0));
      paint(left);
      if (!warned && left <= RED_EYE_MS) { warned = true; setAnnounce('3 seconds'); }
      if (left <= 0) { setAnnounce('Gate closed'); endRef.current?.(); return; }
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [remainingMs, running]);

  return (
    <div className="otm-gate" ref={el}>
      <div className="g-head"><span className="otm-label">{label}</span><span className="g-time" ref={time} aria-hidden="true">0:20</span></div>
      <div className="g-track" role="timer" aria-label="Time left"><div className="g-door l" /><div className="g-door r" /></div>
      <span className="otm-sr" aria-live="assertive">{announce}</span>
    </div>
  );
}
