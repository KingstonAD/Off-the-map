'use client';
/* Browser-side API client. Mirrors the anonymous player ID (httpOnly cookie) into localStorage, and sends it back
   as x-otm-player so a lost cookie can be restored. */
import { useEffect, useRef, useState } from 'react';
import { prefersReducedMotion } from '@/lib/flap';
import type { answerStop, getProgress, logbook, results, startStop } from '@/lib/game';

const KEY = 'otm_pid';

export type TodayResp = {
  playerId: string;
  date: string;
  flightNumber: number;
  launch: string;
  progress: Awaited<ReturnType<typeof getProgress>>;
  streak: number;
  bestStreak: number;
  upcoming: { date: string; flight: number }[];
};
export type StartResp = Awaited<ReturnType<typeof startStop>>;
export type AnswerResp = Awaited<ReturnType<typeof answerStop>>;
export type ResultsResp = NonNullable<Awaited<ReturnType<typeof results>>> & { domain: string };
export type LogbookResp = Awaited<ReturnType<typeof logbook>>;

export class ApiError extends Error {
  constructor(public code: string, public status: number) { super(code); }
}

export async function api<T>(path: string, body?: unknown): Promise<T> {
  const headers: Record<string, string> = { 'content-type': 'application/json' };
  try { const id = localStorage.getItem(KEY); if (id) headers['x-otm-player'] = id; } catch {}
  const res = await fetch(path, {
    method: body === undefined ? 'GET' : 'POST',
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
    cache: 'no-store',
  });
  const j = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(j.error ?? 'network', res.status);
  if (j && typeof j.playerId === 'string') { try { localStorage.setItem(KEY, j.playerId); } catch {} }
  return j as T;
}

/** Ease-out count-up, as in bundle.js countUp(). Snaps when reduced motion is on. */
export function useCountUp(to: number, ms = 1600, from = 0, start = true): number {
  const [v, setV] = useState(from);
  const raf = useRef(0);
  useEffect(() => {
    if (!start) { setV(from); return; }
    if (prefersReducedMotion() || ms <= 1) { setV(to); return; }
    const t0 = performance.now();
    const tick = (now: number) => {
      const p = Math.min(1, (now - t0) / ms), e = 1 - Math.pow(1 - p, 3);
      setV(from + (to - from) * e);
      if (p < 1) raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf.current);
  }, [to, ms, from, start]);
  return v;
}

/** Word-wrap to board lines, never breaking a word. */
export function wrapBoard(text: string, cols: number, maxRows = 3): string[] {
  const lines: string[] = [];
  let cur = '';
  for (const w of text.toUpperCase().split(/\s+/)) {
    if ((cur + ' ' + w).trim().length > cols) { lines.push(cur); cur = w; } else cur = (cur + ' ' + w).trim();
  }
  lines.push(cur);
  return lines.slice(0, maxRows);
}
