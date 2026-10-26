import type { Metadata } from 'next';
import Link from 'next/link';
import { Seal } from '@/components/PassportStamp';
import { yesterday } from '@/lib/game';
import { load, store, today } from '@/lib/server';
import { fmt, pct, tierFor, TIERS } from '@/lib/scoring';
import { addDays, boardDate, longDate } from '@/lib/time';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Yesterday’s arrivals — Off the Map' };

/** Yesterday's 7 prompts with final shares and the rarest correct answers. Built to be screenshotted. */
export default async function Page() {
  const now = today();
  const y = await yesterday(store(), load, now);

  if (!y) {
    const first = load(now);
    return (
      <main className="otm-screen">
        <Top label="Arrivals" />
        <h1 className="otm-title">Yesterday</h1>
        <div className="otm-board" style={{ padding: '18px 16px', textAlign: 'center' }}>
          <div className="otm-label amber" style={{ marginBottom: 10 }}>No arrivals yet</div>
          <p className="otm-body">
            {first
              ? `Flight #${first.flight} is in the air today. Its final answer shares land here at 12 AM ET on ${longDate(addDays(now, 1))}.`
              : 'No flight landed yesterday. Check back after the next one closes.'}
          </p>
        </div>
      </main>
    );
  }

  const travellers = Math.max(...y.stops.map((s) => s.travellers));
  const rarestAll = y.stops
    .filter((s) => s.rarest)
    .map((s) => ({ stop: s, a: s.rarest! }))
    .sort((a, b) => a.a.share - b.a.share)[0];

  return (
    <main className="otm-screen" style={{ gap: 14 }}>
      <Top label={`Arrivals · Flight #${y.flight}`} />
      <div>
        <h1 className="otm-title">Yesterday</h1>
        <div className="otm-label" style={{ marginTop: 6 }}>
          Flight #{y.flight} · {boardDate(y.date)} · {fmt(travellers)} traveller{travellers === 1 ? '' : 's'}
        </div>
      </div>

      {rarestAll && (
        <div className="otm-passport" style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 14px' }}>
          <Seal tier={tierFor(rarestAll.a.share)} rot={-10} style={{ width: 78, height: 78, fontSize: 18, lineHeight: '18px' }}>
            <span>{pct(rarestAll.a.share)}<small>said it</small></span>
          </Seal>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="otm-card-k" style={{ fontSize: 9.5, letterSpacing: '.16em' }}>RAREST ANSWER OF THE DAY</div>
            <div style={{ font: '800 30px/30px var(--font-flap)', textTransform: 'uppercase', letterSpacing: '.03em', marginTop: 4 }}>
              Only {pct(rarestAll.a.share)} said {rarestAll.a.name}
            </div>
            <div style={{ font: '400 12px/15px var(--font-sans)', color: 'var(--paper-muted)', marginTop: 4 }}>{rarestAll.stop.prompt}</div>
          </div>
        </div>
      )}

      {y.stops.map((s) => {
        const said = s.answers.filter((a) => a.count > 0);
        const top = said.slice(0, 5);
        const max = Math.max(...top.map((a) => a.share), 0.0001);
        const nobody = s.answers.filter((a) => a.count === 0).map((a) => a.name);
        return (
          <section key={s.stop} className="otm-board otm-ystop" aria-label={`Stop ${s.stop + 1}: ${s.prompt}`}>
            <div className="otm-board-head" style={{ padding: 0 }}>
              <span className="otm-label amber">Stop {s.stop + 1}</span>
              <span className="otm-label amber">{s.category}</span>
            </div>
            <div className="otm-yprompt">{s.prompt}</div>

            {s.rarest && (
              <div className="otm-passport" style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px' }}>
                <Seal tier={tierFor(s.rarest.share)} rot={8} style={{ width: 44, height: 44, fontSize: 10, lineHeight: '10px' }}>
                  <span>{TIERS[tierFor(s.rarest.share)].name.slice(0, 1)}</span>
                </Seal>
                <div style={{ font: '700 18px/20px var(--font-flap)', letterSpacing: '.03em', textTransform: 'uppercase' }}>
                  Only {pct(s.rarest.share)} said {s.rarest.name}
                </div>
              </div>
            )}

            <div>
              {top.map((a) => (
                <div key={a.id} className={TIERS[tierFor(a.share)].cls} style={{ display: 'flex', alignItems: 'center', gap: 10, height: 24 }}>
                  <span className="otm-row-name" style={{ width: 128 }} title={a.name}>{a.name}</span>
                  <span className="otm-bar"><span style={{ width: `${(a.share / max) * 100}%` }} /></span>
                  <span className="otm-data" style={{ width: 44, textAlign: 'right', color: 'var(--ink-300)' }}>{pct(a.share)}</span>
                </div>
              ))}
              {!top.length && <div className="otm-note">Nobody answered this stop correctly.</div>}
            </div>

            <div className="otm-label otm-sublabel" style={{ lineHeight: '15px' }}>
              {s.answers.length} valid answers
              {nobody.length > 0 && <> · Nobody said: {nobody.slice(0, 6).join(', ')}{nobody.length > 6 ? ` +${nobody.length - 6} more` : ''}</>}
            </div>
          </section>
        );
      })}

      <div style={{ textAlign: 'center', padding: '6px 0 4px' }}>
        <div style={{ font: '800 22px/24px var(--font-flap)', letterSpacing: '.06em', color: 'var(--amber-500)' }}>OFF THE MAP</div>
        <div className="otm-label" style={{ marginTop: 4 }}>New flight daily · 12 AM ET</div>
      </div>
    </main>
  );
}

function Top({ label }: { label: string }) {
  return (
    <div className="otm-topbar">
      <Link className="otm-icon-btn" aria-label="Home" href="/">&#8592;</Link>
      <span className="otm-label amber">{label}</span>
      <span style={{ width: 32 }} />
    </div>
  );
}
