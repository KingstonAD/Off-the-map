'use client';
import { useEffect, useRef } from 'react';
import { FlapBoard, type FlapSize } from '@/lib/flap';

type Props = {
  lines: string[];
  cols?: number;
  rows?: number;
  size?: FlapSize;
  align?: 'left' | 'center';
  /** spin: tiles spin through the drum (prompts, logos). direct: one flip per change (countdowns). instant: snap (per-frame updates). */
  mode?: 'spin' | 'direct' | 'instant';
  /** Row indexes drawn in dim amber (scheduled departures). */
  dimRows?: number[];
  justify?: 'center' | 'start';
  label?: string;
  className?: string;
  style?: React.CSSProperties;
};

/** Amber split-flap board. aria-label carries the full text; tiles are aria-hidden. */
export function SplitFlap({ lines, cols = 14, rows, size = '', align, mode = 'spin', dimRows, justify = 'center', label, className, style }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const board = useRef<FlapBoard | null>(null);
  const nRows = rows ?? lines.length;
  const text = lines.join('\n');

  useEffect(() => {
    board.current = new FlapBoard(ref.current!, { cols, rows: nRows, size, align });
    return () => { board.current = null; };
  }, [cols, nRows, size, align]);

  useEffect(() => {
    const b = board.current;
    if (!b) return;
    const ls = text.split('\n');
    if (mode === 'instant') b.setInstant(ls);
    else void b.set(ls, mode === 'direct' ? { direct: true, stagger: 0 } : {});
  }, [text, mode, cols, nRows, size, align]);

  const dimKey = (dimRows ?? []).join(',');
  useEffect(() => {
    const dim = new Set(dimKey ? dimKey.split(',').map(Number) : []);
    board.current?.rows.forEach((r, i) => r.forEach((c) => c.classList.toggle('dim', dim.has(i))));
  }, [dimKey, cols, nRows, size, align]);

  return (
    <div
      ref={ref}
      role="img"
      aria-label={label ?? lines.join(' ').replace(/\s+/g, ' ').trim()}
      className={(justify === 'start' ? 'otm-flap-start ' : '') + (className ?? '')}
      style={style}
    />
  );
}
