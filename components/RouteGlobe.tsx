'use client';
import { useEffect, useRef } from 'react';
import { prefersReducedMotion } from '@/lib/flap';
import { CIRCUMFERENCE, type Tier } from '@/lib/scoring';

type Props = {
  stops: { km: number; tier: Tier | null }[];
  total: number;
  replay: number;
  onFrame: (km: number, done: boolean) => void;
};

const NS = 'http://www.w3.org/2000/svg';
const PLANE = 'M9 0 L-3 -2.2 L-7 -9 L-9.5 -9 L-6.5 -1.8 L-11 -1.6 L-13.5 -4.5 L-15 -4.5 L-13.5 0 L-15 4.5 L-13.5 4.5 L-11 1.6 L-6.5 1.8 L-9.5 9 L-7 9 L-3 2.2 Z';

/** The plane flies a dotted route around the globe; stop markers light in tier colours as it passes.
    It lands at total ÷ 40,075 of the way round, so the loop only closes on a perfect flight. */
export function RouteGlobe({ stops, total, replay, onFrame }: Props) {
  const route = useRef<SVGPathElement>(null);
  const dotsG = useRef<SVGGElement>(null);
  const marksG = useRef<SVGGElement>(null);
  const plane = useRef<SVGGElement>(null);
  const frameCb = useRef(onFrame);
  frameCb.current = onFrame;
  const key = stops.map((s) => `${s.km}:${s.tier}`).join(',');

  useEffect(() => {
    const path = route.current!, L = path.getTotalLength();
    const mk = (n: string, a: Record<string, string | number>, p: Element) => {
      const e = document.createElementNS(NS, n);
      for (const k in a) e.setAttribute(k, String(a[k]));
      p.appendChild(e);
      return e as SVGElement;
    };
    dotsG.current!.innerHTML = '';
    marksG.current!.innerHTML = '';
    const dots: { at: number; e: SVGElement }[] = [];
    for (let s = 0; s <= L; s += 7) {
      const p = path.getPointAtLength(s), back = s > L / 2;
      const e = mk('circle', { cx: p.x.toFixed(2), cy: p.y.toFixed(2), r: back ? 1.1 : 1.5, opacity: back ? 0.35 : 0.9 }, dotsG.current!);
      e.style.fill = 'var(--amber-700)';
      dots.push({ at: s, e });
    }
    let cum = 0;
    const marks: { at: number; g: SVGElement }[] = [];
    for (const st of stops) {
      cum += st.km;
      if (!st.km || !st.tier) continue;
      const at = (Math.min(cum, CIRCUMFERENCE) / CIRCUMFERENCE) * L, p = path.getPointAtLength(at);
      const g = mk('g', { opacity: 0, transform: `translate(${p.x.toFixed(2)} ${p.y.toFixed(2)})` }, marksG.current!);
      const c = mk('circle', { r: 4.2, 'stroke-width': 2 }, g);
      c.style.fill = 'var(--terminal-900)';
      c.style.stroke = `var(--tier-${st.tier}-lit)`;
      marks.push({ at, g });
    }
    const sp = path.getPointAtLength(0);
    mk('circle', { cx: sp.x, cy: sp.y, r: 3 }, marksG.current!).style.fill = 'var(--ink-100)';

    const placePlane = (at: number) => {
      const a = path.getPointAtLength(Math.max(0, at - 0.5)), b = path.getPointAtLength(Math.min(L, at + 0.5));
      const ang = (Math.atan2(b.y - a.y, b.x - a.x) * 180) / Math.PI, p = path.getPointAtLength(at);
      plane.current!.setAttribute('transform', `translate(${p.x.toFixed(2)} ${p.y.toFixed(2)}) rotate(${ang.toFixed(1)}) scale(0.9)`);
    };

    const end = (Math.min(total, CIRCUMFERENCE) / CIRCUMFERENCE) * L;
    const dur = prefersReducedMotion() ? 0 : 3800;
    const t0 = performance.now() + 400;
    let raf = 0;
    const f = (now: number) => {
      const p = dur ? Math.min(1, Math.max(0, (now - t0) / dur)) : 1, e = 1 - Math.pow(1 - p, 2.4), at = end * e;
      for (const d of dots) if (d.at <= at) d.e.style.fill = 'var(--amber-500)';
      for (const m of marks) if (m.at <= at + 0.01) m.g.setAttribute('opacity', '1');
      placePlane(at);
      frameCb.current(total * e, p >= 1);
      if (p < 1) raf = requestAnimationFrame(f);
    };
    raf = requestAnimationFrame(f);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, total, replay]);

  return (
    <svg viewBox="-120 -112 240 224" width="240" height="224" aria-hidden="true">
      <defs>
        <radialGradient id="gfill" cx="40%" cy="35%" r="75%"><stop offset="0" stopColor="#2a2f35" /><stop offset="1" stopColor="#15181b" /></radialGradient>
      </defs>
      <circle r="100" fill="url(#gfill)" style={{ stroke: 'var(--terminal-600)' }} strokeWidth="1" />
      <g fill="none" style={{ stroke: 'var(--terminal-600)' }} strokeWidth="0.7" opacity="0.9">
        {[100, 82, 57, 26].map((rx) => <ellipse key={rx} rx={rx} ry={100} />)}
        {[-70, -36, 0, 36, 70].map((y) => { const rx = Math.sqrt(10000 - y * y); return <ellipse key={y} cy={y} rx={rx} ry={rx * 0.16} />; })}
      </g>
      <g transform="rotate(-18)">
        <path ref={route} d="M -100 0 A 100 40 0 0 0 100 0 A 100 40 0 0 0 -100 0" fill="none" stroke="none" />
        <g ref={dotsG} />
        <g ref={marksG} />
        <g ref={plane}><path d={PLANE} style={{ fill: 'var(--amber-300)', filter: 'drop-shadow(0 0 4px rgba(255,181,46,.8))' }} /></g>
      </g>
    </svg>
  );
}
