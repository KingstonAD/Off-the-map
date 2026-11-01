/* The boarding-pass share card as a 1080×1350 PNG (Satori via next/og). Every number is computed; no prompts or answers. */
import fs from 'node:fs/promises';
import path from 'node:path';
import { ImageResponse } from 'next/og';
import { NextResponse } from 'next/server';
import { results } from '@/lib/game';
import { load, playerId, store, today } from '@/lib/server';
import { cardData } from '@/lib/share-card';
import type { Tier } from '@/lib/scoring';
import { isUnit } from '@/lib/units';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const C = {
  t950: '#0b0c0e', t900: '#121417', t600: '#33383f', ink300: '#a39f95', amber: '#ffb52e',
  paper: '#f1e8d4', paper200: '#e2d5b9', paperInk: '#1f1b16', muted: '#5f5748', redeye: '#b3261e',
};
const INK: Record<Tier, string> = { tourist: '#5b6670', backpacker: '#2f6b45', explorer: '#1f4f8f', uncharted: '#6e2463', lost: '#3b342d' };
const S = 2.6; // card drawn at phone size (348px), scaled up
const px = (n: number) => Math.round(n * S * 10) / 10;
const PLANE = 'M9 0 L-3 -2.2 L-7 -9 L-9.5 -9 L-6.5 -1.8 L-11 -1.6 L-13.5 -4.5 L-15 -4.5 L-13.5 0 L-15 4.5 L-13.5 4.5 L-11 1.6 L-6.5 1.8 L-9.5 9 L-7 9 L-3 2.2 Z';

let fonts: Promise<{ name: string; data: Buffer; weight: 500 | 700 | 800; style: 'normal' }[]> | null = null;
function loadFonts() {
  const dir = path.join(process.cwd(), 'assets', 'fonts');
  fonts ??= Promise.all([
    fs.readFile(path.join(dir, 'BarlowCondensed-ExtraBold.ttf')).then((data) => ({ name: 'Flap', data, weight: 800 as const, style: 'normal' as const })),
    fs.readFile(path.join(dir, 'BarlowCondensed-Bold.ttf')).then((data) => ({ name: 'Flap', data, weight: 700 as const, style: 'normal' as const })),
    fs.readFile(path.join(dir, 'IBMPlexMono-Medium.ttf')).then((data) => ({ name: 'Mono', data, weight: 500 as const, style: 'normal' as const })),
  ]);
  return fonts;
}

const label = (size = 9, spacing = 0.14) => ({ fontFamily: 'Mono', fontWeight: 500, fontSize: px(size), letterSpacing: `${spacing}em`, color: C.muted });

function Barcode({ w, h }: { w: number; h: number }) {
  // Same rhythm as .otm-barcode: bars of 2,1,3 with gaps of 1,3,1 (px, at card scale).
  const bars: { x: number; w: number }[] = [];
  for (let x = 0; x < w; x += 11) [[0, 2], [3, 1], [7, 3]].forEach(([o, bw]) => { if (x + o < w) bars.push({ x: x + o, w: Math.min(bw, w - x - o) }); });
  return (
    <div style={{ display: 'flex', position: 'relative', width: px(w), height: px(h), opacity: 0.9 }}>
      {bars.map((b, i) => <div key={i} style={{ position: 'absolute', left: px(b.x), top: 0, width: px(b.w), height: px(h), background: C.paperInk }} />)}
    </div>
  );
}

export async function GET(req: Request) {
  const r = await results(store(), load, await playerId(), today());
  if (!r || !r.complete) return NextResponse.json({ error: 'not_landed' }, { status: 404 });
  const u = new URL(req.url).searchParams.get('u');
  const c = cardData(r, '', isUnit(u) ? u : 'km');
  const W = 348;

  return new ImageResponse(
    (
      <div style={{ width: 1080, height: 1350, display: 'flex', alignItems: 'center', justifyContent: 'center', background: C.t950 }}>
        <div style={{ width: px(W), display: 'flex', flexDirection: 'column', background: C.paper, color: C.paperInk, borderRadius: px(14), overflow: 'hidden', position: 'relative', boxShadow: '0 30px 70px rgba(0,0,0,0.55)' }}>
          {/* header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: C.t900, padding: `${px(12)}px ${px(16)}px ${px(10)}px` }}>
            <div style={{ fontFamily: 'Flap', fontWeight: 800, fontSize: px(24), letterSpacing: '0.08em', color: C.amber }}>OFF THE MAP</div>
            <div style={{ ...label(9.5, 0.16), color: C.ink300 }}>BOARDING PASS</div>
          </div>
          {/* fields */}
          <div style={{ display: 'flex', padding: `${px(14)}px ${px(16)}px ${px(6)}px` }}>
            {[['FLIGHT', `#${c.flight}`], ['DATE', c.date], ['STOPS', String(c.stops)]].map(([k, v], i) => (
              <div key={k} style={{ display: 'flex', flexDirection: 'column', flex: 1, alignItems: i === 2 ? 'flex-end' : 'flex-start' }}>
                <div style={label()}>{k}</div>
                <div style={{ fontFamily: 'Flap', fontWeight: 700, fontSize: px(22), lineHeight: 1.2 }}>{v}</div>
              </div>
            ))}
          </div>
          {/* distance */}
          <div style={{ display: 'flex', flexDirection: 'column', padding: `${px(2)}px ${px(16)}px 0` }}>
            <div style={label()}>DISTANCE FLOWN</div>
            <div style={{ display: 'flex', alignItems: 'baseline', fontFamily: 'Flap', fontWeight: 800, fontSize: px(64), lineHeight: 1 }}>
              {c.totalText}<span style={{ fontSize: px(30), marginLeft: px(6) }}>{c.unitText}</span>
            </div>
            <div style={{ ...label(10.5, 0.12), marginTop: px(2) }}>{c.line}</div>
          </div>
          {/* route: 0 → once around the world, plane at total ÷ circumference */}
          <div style={{ display: 'flex', position: 'relative', margin: `${px(14)}px ${px(16)}px 0`, height: px(8) }}>
            <div style={{ display: 'flex', position: 'absolute', left: 0, right: 0, top: px(3), justifyContent: 'space-between', opacity: 0.6 }}>
              {Array.from({ length: 60 }, (_, i) => <div key={i} style={{ width: px(2), height: px(2), borderRadius: px(1), background: C.muted }} />)}
            </div>
            <div style={{ position: 'absolute', left: 0, top: 0, width: px(8), height: px(8), borderRadius: px(4), background: C.paperInk }} />
            <div style={{ position: 'absolute', right: 0, top: 0, width: px(8), height: px(8), borderRadius: px(4), border: `${px(2)}px solid ${C.paperInk}` }} />
            <div style={{ display: 'flex', position: 'absolute', left: px((W - 32) * c.progress) - px(8), top: px(-4) }}>
              <svg width={px(16)} height={px(16)} viewBox="-16 -10 26 20"><path d={PLANE} fill={C.paperInk} /></svg>
            </div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: `${px(4)}px ${px(16)}px 0` }}>
            <div style={label(8.5, 0.12)}>0 {c.unitText}</div>
            <div style={label(8.5, 0.12)}>{c.circumferenceText} {c.unitText}</div>
          </div>
          {/* 7 stamp squares */}
          <div style={{ display: 'flex', justifyContent: 'center', padding: `${px(16)}px ${px(16)}px ${px(18)}px` }}>
            {c.squares.map((s, i) => (
              <div key={i} style={{ display: 'flex', position: 'relative', width: px(36), height: px(36), marginLeft: i ? px(6) : 0, borderRadius: px(4), background: INK[s.tier],
                ...(s.tier === 'lost' ? { backgroundImage: `repeating-linear-gradient(45deg, ${INK.lost} 0px, ${INK.lost} ${px(4)}px, #4a4239 ${px(4)}px, #4a4239 ${px(8)}px)` } : {}) }}>
                {s.redEye && <div style={{ position: 'absolute', right: px(-4), top: px(-4), width: px(13), height: px(13), borderRadius: px(7), background: C.redeye, border: `${px(2)}px solid ${C.paper}` }} />}
              </div>
            ))}
          </div>
          {/* stub */}
          <div style={{ display: 'flex', position: 'relative', alignItems: 'center', justifyContent: 'space-between', borderTop: `${px(2)}px dashed ${C.paper200}`, padding: `${px(12)}px ${px(16)}px ${px(14)}px` }}>
            <div style={{ position: 'absolute', left: px(-10), top: px(-11), width: px(20), height: px(20), borderRadius: px(10), background: C.t950 }} />
            <div style={{ position: 'absolute', right: px(-10), top: px(-11), width: px(20), height: px(20), borderRadius: px(10), background: C.t950 }} />
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <div style={{ fontFamily: 'Flap', fontWeight: 700, fontSize: px(19), letterSpacing: '0.03em' }}>Bon voyage. No spoilers.</div>
              <div style={{ ...label(), marginTop: px(4) }}>NEW FLIGHT DAILY · 12 AM ET</div>
            </div>
            <Barcode w={64} h={30} />
          </div>
        </div>
      </div>
    ),
    { width: 1080, height: 1350, fonts: await loadFonts(), headers: { 'cache-control': 'private, no-store' } },
  );
}
