import type { CSSProperties, ReactNode } from 'react';
import { TIERS, type Tier } from '@/lib/scoring';

type StampProps = {
  tier: Tier;
  top: [string, string];
  answer: string;
  left: string;
  right: string;
  rot?: number;
  slam?: boolean;
  style?: CSSProperties;
};

/** Rubber stamp in its tier's ink. Only on paper (.otm-passport): multiply disappears on dark surfaces. */
export function PassportStamp({ tier, top, answer, left, right, rot = -6, slam, style }: StampProps) {
  // Long names shrink so the stamp stays inside the passport page (~280px of text at most).
  const ansSize = Math.min(22, Math.floor(280 / (Math.max(1, answer.length) * 0.5)));
  return (
    <div
      className={`otm-stamp ${TIERS[tier].cls}${tier === 'lost' ? ' lost' : ''}${slam ? ' slam' : ''}`}
      style={{ '--rot': `${rot}deg`, ...style } as CSSProperties}
    >
      <div className="in">
        <div className="s-top"><span>{top[0]}</span><span aria-hidden="true">&#9992;</span><span>{top[1]}</span></div>
        <div className="s-tier" style={tier === 'lost' ? { fontSize: 38 } : undefined}>{TIERS[tier].name}</div>
        <div className="s-ans" style={{ fontSize: ansSize }}>{answer}</div>
        <div className="s-row"><span>{left}</span><span>{right}</span></div>
      </div>
    </div>
  );
}

export function Seal({ tier, children, rot = -8, style, className }: { tier: Tier | 'redeye'; children: ReactNode; rot?: number; style?: CSSProperties; className?: string }) {
  return (
    <span className={`otm-seal t-${tier} ${className ?? ''}`} style={{ '--rot': `${rot}deg`, ...style } as CSSProperties}>
      {children}
    </span>
  );
}

/** The Red-Eye badge: a round red seal pressed after the tier stamp. Not a tier; no km. */
export function RedEyeBadge({ left, slam, style }: { left: string; slam?: boolean; style?: CSSProperties }) {
  return (
    <div className={`otm-redeye${slam ? ' slam' : ''}`} style={style}>
      <span><b>Red-Eye</b><small>{left} left</small></span>
    </div>
  );
}
