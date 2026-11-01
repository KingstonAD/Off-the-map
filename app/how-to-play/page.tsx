import type { CSSProperties } from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { BoardingPass } from '@/components/BoardingPass';
import { DistanceBriefing } from '@/components/DistanceBriefing';

export const metadata: Metadata = { title: 'How to play — Off the Map' };

const cell = (right: boolean, bottom: boolean): CSSProperties => ({
  padding: '10px 12px',
  borderRight: right ? '1px dashed var(--terminal-600)' : undefined,
  borderBottom: bottom ? '1px dashed var(--terminal-600)' : undefined,
});

export default function Page() {
  return (
    <main className="otm-screen" style={{ gap: 12 }}>
      <div className="otm-topbar">
        <Link className="otm-icon-btn" aria-label="Back" href="/">&#8592;</Link>
        <span className="otm-label amber">Pre-flight briefing</span>
        <span style={{ width: 32 }} />
      </div>
      <h1 className="otm-title">How to play</h1>

      <div className="otm-board" style={{ padding: 0, display: 'grid', gridTemplateColumns: '1fr 1fr' }}>
        {[
          ['Stops', '7 PROMPTS', 'Same for everyone, every day'],
          ['Gate time', '20 SEC', 'Per stop. Then the gate shuts'],
          ['Carry-on', '1 ANSWER', 'No changes once it’s stamped'],
          ['Mileage', 'RARE = FAR', 'The rarer the answer, the farther you fly'],
        ].map(([k, v, note], i) => (
          <div key={k} style={cell(i % 2 === 0, i < 2)}>
            <div className="otm-label">{k}</div>
            <div className="otm-amber" style={{ font: '700 26px/30px var(--font-flap)' }}>{v}</div>
            <div className="otm-label otm-sublabel">{note}</div>
          </div>
        ))}
      </div>

      <p className="otm-body" style={{ fontSize: 14, lineHeight: '20px' }}>
        Pick your answer from the list as you type. Every valid answer has a fixed rarity score, set before the flight, so
        the rarer the answer, the farther you fly. Your distance is locked in the moment you stamp it. Once 20 players
        have answered a stop, you’ll also see what share of players said the same thing. That’s for bragging rights only
        and never changes your score.
      </p>

      <DistanceBriefing />

      <BoardingPass amber slim style={{ marginTop: 'auto' }} href="/" ariaLabel="Got it, back to the gate" small="Ready?" strong="Got it →" stubLabel="GATE" stubCode="1" />
    </main>
  );
}
