'use client';
import { useEffect, useMemo, useState } from 'react';
import type { ResultsResp } from '@/lib/client';
import { cardData } from '@/lib/share-card';
import { TIERS } from '@/lib/scoring';

/** Share sheet from Results: boarding-pass card, 7 stamp-colour squares, copyable spoiler-free text. */
export function ShareSheet({ r, onClose }: { r: ResultsResp; onClose: () => void }) {
  const domain = r.domain || (typeof window !== 'undefined' ? window.location.host : '');
  const c = useMemo(() => cardData(r, domain), [r, domain]);
  const [copied, setCopied] = useState(false);
  const [shareLabel, setShareLabel] = useState('Share ↗');
  const [saveLabel, setSaveLabel] = useState('Save image');
  const [png, setPng] = useState<Blob | null>(null);

  // Print the PNG up front: Safari only allows navigator.share() straight from a tap, not after an await.
  useEffect(() => {
    let live = true;
    fetch('/api/share-image', { cache: 'no-store' })
      .then((res) => (res.ok ? res.blob() : null))
      .then((b) => { if (live) setPng(b); })
      .catch(() => {});
    return () => { live = false; };
  }, []);

  useEffect(() => {
    const k = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  }, [onClose]);

  const copy = async () => {
    try { await navigator.clipboard.writeText(c.text); setCopied(true); setTimeout(() => setCopied(false), 1800); return true; } catch { return false; }
  };

  const share = async () => {
    if (navigator.share) {
      try { await navigator.share({ text: c.text }); return; } catch (e) { if ((e as Error).name === 'AbortError') return; }
    }
    if (await copy()) { setShareLabel('Copied'); setTimeout(() => setShareLabel('Share ↗'), 1800); }
  };

  const save = async () => {
    try {
      let blob = png;
      if (!blob) {
        setSaveLabel('Printing…');
        const res = await fetch('/api/share-image', { cache: 'no-store' });
        if (!res.ok) throw new Error('image');
        blob = await res.blob();
        setPng(blob);
      }
      const file = new File([blob], `off-the-map-${c.flight}.png`, { type: 'image/png' });
      if (navigator.canShare?.({ files: [file] })) {
        try { await navigator.share({ files: [file] }); } catch {}
      } else {
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = file.name;
        a.click();
        setTimeout(() => URL.revokeObjectURL(a.href), 5000);
      }
      setSaveLabel('Save image');
    } catch {
      setSaveLabel('Try again');
    }
  };

  return (
    <div className="otm-sheet" role="dialog" aria-modal="true" aria-label="Share your flight">
      <div className="otm-app">
        <div className="otm-screen" style={{ gap: 14 }}>
          <div className="otm-topbar">
            <button className="otm-icon-btn" aria-label="Close" onClick={onClose} autoFocus>&#10005;</button>
            <span className="otm-label amber">Share your flight</span>
            <span style={{ width: 32 }} />
          </div>

          <ShareCard c={c} />

          <div className="otm-panel" style={{ padding: '10px 12px' }}>
            <div className="otm-kv" style={{ marginBottom: 6 }}>
              <span className="otm-label">Text version</span>
              <button className="otm-ghost" style={{ height: 24, padding: '0 8px', fontSize: 10 }} onClick={copy}>{copied ? 'Copied' : 'Copy'}</button>
            </div>
            <pre style={{ margin: 0, font: '500 13px/19px var(--font-mono)', color: 'var(--ink-100)', whiteSpace: 'pre-wrap' }}>{c.text}</pre>
          </div>

          <div style={{ display: 'flex', gap: 10, marginTop: 'auto' }}>
            <button className="otm-ghost" style={{ flex: 1 }} onClick={save}>{saveLabel}</button>
            <button className="otm-pass amber slim" style={{ flex: 1.4, height: 44, borderRadius: 10, WebkitMask: 'none', mask: 'none' }} aria-label="Share" onClick={share}>
              <span className="main" style={{ padding: '0 14px', justifyContent: 'center' }}><strong style={{ fontSize: 22 }}>{shareLabel}</strong></span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export function ShareCard({ c }: { c: ReturnType<typeof cardData> }) {
  return (
    <div style={{ background: 'var(--paper-100)', color: 'var(--paper-ink)', borderRadius: 'var(--radius-pass)', boxShadow: 'var(--shadow-pass)', position: 'relative', overflow: 'hidden', margin: '4px 6px 0' }}>
      <div style={{ background: 'var(--terminal-900)', color: 'var(--amber-500)', padding: '12px 16px 10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ font: '800 24px/1 var(--font-flap)', letterSpacing: '.08em' }}>OFF THE MAP</span>
        <span style={{ font: '500 9.5px/1 var(--font-mono)', letterSpacing: '.16em', color: 'var(--ink-300)' }}>BOARDING PASS</span>
      </div>
      <div style={{ padding: '14px 16px 6px', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6 }}>
        <div><div className="otm-card-k">FLIGHT</div><div className="otm-card-v">#{c.flight}</div></div>
        <div><div className="otm-card-k">DATE</div><div className="otm-card-v">{c.date}</div></div>
        <div style={{ textAlign: 'right' }}><div className="otm-card-k">STOPS</div><div className="otm-card-v">{c.stops}</div></div>
      </div>
      <div style={{ padding: '2px 16px 0' }}>
        <div className="otm-card-k">DISTANCE FLOWN</div>
        <div style={{ font: '800 64px/62px var(--font-flap)', letterSpacing: '.01em' }}>{c.totalText}<span style={{ fontSize: 30, marginLeft: 6 }}>KM</span></div>
        <div style={{ font: '500 10.5px/1 var(--font-mono)', letterSpacing: '.12em', color: 'var(--paper-muted)', marginTop: 2 }}>{c.line}</div>
      </div>
      <div style={{ position: 'relative', margin: '14px 16px 0', height: 8 }} role="img" aria-label={`${Math.round(c.progress * 100)}% of the way around the world`}>
        <div style={{ position: 'absolute', inset: '3px 0 auto', borderTop: '2px dotted var(--paper-muted)', opacity: 0.6 }} />
        <div style={{ position: 'absolute', left: 0, top: 0, width: 8, height: 8, borderRadius: '50%', background: 'var(--paper-ink)' }} />
        <div style={{ position: 'absolute', left: `${(c.progress * 100).toFixed(1)}%`, top: -5, fontSize: 14, lineHeight: 1, transform: 'translateX(-50%)' }} aria-hidden="true">&#9992;</div>
        <div style={{ position: 'absolute', right: 0, top: 0, width: 8, height: 8, borderRadius: '50%', border: '2px solid var(--paper-ink)' }} />
      </div>
      <div className="otm-kv" style={{ padding: '4px 16px 0' }}>
        <span className="otm-card-k" style={{ fontSize: 8.5, letterSpacing: '.12em' }}>0 KM</span>
        <span className="otm-card-k" style={{ fontSize: 8.5, letterSpacing: '.12em' }}>40,075 KM</span>
      </div>
      <div style={{ display: 'flex', gap: 6, justifyContent: 'center', padding: '16px 16px 18px' }}>
        {c.squares.map((s, i) => (
          <span
            key={i}
            className={`otm-sq ${TIERS[s.tier].cls}`}
            title={`Stop ${i + 1}: ${TIERS[s.tier].name}${s.redEye ? ' + Red-Eye badge' : ''}`}
            style={{ position: 'relative', width: 36, height: 36, background: s.tier === 'lost' ? 'repeating-linear-gradient(45deg,var(--ink) 0 4px,#4a4239 4px 8px)' : undefined }}
          >
            {s.redEye && <span className="otm-redeye-dot" />}
          </span>
        ))}
      </div>
      <div style={{ position: 'relative', borderTop: '2px dashed var(--paper-200)', padding: '12px 16px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
        <span style={{ position: 'absolute', left: -10, top: -11, width: 20, height: 20, borderRadius: '50%', background: 'var(--terminal-900)' }} />
        <span style={{ position: 'absolute', right: -10, top: -11, width: 20, height: 20, borderRadius: '50%', background: 'var(--terminal-900)' }} />
        <div>
          <div style={{ font: '700 19px/22px var(--font-flap)', letterSpacing: '.03em' }}>Bon voyage. No spoilers.</div>
          <div className="otm-card-k" style={{ marginTop: 4 }}>NEW FLIGHT DAILY · 12 AM ET</div>
        </div>
        <span className="otm-barcode" style={{ width: 64, height: 30, flex: 'none' }} />
      </div>
    </div>
  );
}
