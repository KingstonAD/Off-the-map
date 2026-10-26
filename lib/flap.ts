/* Split-flap board engine — a typed port of board/cell/spin/flipTo from design/components/bundle.js.
   Imperative on purpose: each tile animates through the drum on its own timer, outside React's render cycle. */

export const CHARSET = " ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789#%:,.-/+&'";
export type FlapSize = '' | 'sm' | 'xl';

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));
export const prefersReducedMotion = () =>
  typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

type Cell = HTMLSpanElement & { dataset: { ch?: string } };

function parts(c: Cell) {
  const b = c.querySelectorAll('b');
  return { t: b[0], b: b[1], f1: b[2], f2: b[3] };
}
function setNow(c: Cell, ch: string) {
  const p = parts(c);
  p.t.textContent = p.b.textContent = p.f1.textContent = p.f2.textContent = ch;
  c.dataset.ch = ch;
}
function cell(ch: string, cls: string): Cell {
  const c = document.createElement('span') as Cell;
  c.className = 'otm-cell' + (cls ? ' ' + cls : '');
  c.setAttribute('aria-hidden', 'true');
  c.innerHTML = '<span class="h t"><b></b></span><span class="h b"><b></b></span><span class="h t f1"><b></b></span><span class="h b f2"><b></b></span>';
  setNow(c, ch || ' ');
  return c;
}
function flipTo(c: Cell, ch: string): Promise<void> {
  const p = parts(c), old = c.dataset.ch || ' ';
  if (old === ch) return Promise.resolve();
  p.t.textContent = ch; p.b.textContent = old; p.f1.textContent = old; p.f2.textContent = ch;
  c.classList.remove('go'); void c.offsetWidth; c.classList.add('go');
  c.dataset.ch = ch;
  const fd = parseFloat(getComputedStyle(c).getPropertyValue('--fd')) || 55;
  return sleep(fd * 2 + 12).then(() => { p.b.textContent = ch; c.classList.remove('go'); });
}
/** Spin forward through the drum (Solari-style) and land on the target. */
function spin(c: Cell, target: string, extra = 0, alive: () => boolean = () => true): Promise<void> {
  if (prefersReducedMotion()) { setNow(c, target); return Promise.resolve(); }
  let cur = CHARSET.indexOf(c.dataset.ch || ' '); if (cur < 0) cur = 0;
  const ti = CHARSET.indexOf(target);
  if (ti < 0) return flipTo(c, target);
  const dist = (ti - cur + CHARSET.length) % CHARSET.length;
  const steps = Math.min(dist, 4 + extra + Math.floor(Math.random() * 5));
  const seq: string[] = [];
  for (let i = steps - 1; i >= 1; i--) seq.push(CHARSET[(ti - i + CHARSET.length) % CHARSET.length]);
  seq.push(target);
  return seq.reduce((pr, ch) => pr.then(() => (alive() ? flipTo(c, ch) : undefined)), Promise.resolve());
}

export type BoardOpts = { cols?: number; rows?: number; size?: FlapSize; align?: 'left' | 'center' };
export type SetOpts = { stagger?: number; direct?: boolean; extra?: number };

export class FlapBoard {
  rows: Cell[][] = [];
  private gen = 0;
  constructor(private el: HTMLElement, private opts: Required<Pick<BoardOpts, 'cols' | 'rows'>> & BoardOpts) {
    el.innerHTML = '';
    for (let r = 0; r < opts.rows; r++) {
      const row = document.createElement('div');
      row.className = 'otm-row';
      const cs: Cell[] = [];
      for (let k = 0; k < opts.cols; k++) { const c = cell(' ', opts.size || ''); row.appendChild(c); cs.push(c); }
      el.appendChild(row);
      this.rows.push(cs);
    }
  }
  private pad(s: string | undefined) {
    const { cols, align } = this.opts;
    let x = (s || '').toUpperCase().slice(0, cols);
    if (align === 'center') x = ' '.repeat(Math.floor((cols - x.length) / 2)) + x;
    return x.padEnd(cols, ' ');
  }
  set(lines: string[], o: SetOpts = {}): Promise<void> {
    const gen = ++this.gen;
    const all: Promise<void>[] = [];
    this.rows.forEach((cs, r) => {
      const s = this.pad(lines[r]);
      cs.forEach((c, k) => {
        const d = o.stagger === 0 ? 0 : r * 90 + k * 28;
        all.push(sleep(d).then(() => {
          const alive = () => gen === this.gen; // a newer set() supersedes this one
          if (!alive()) return;
          return o.direct ? flipTo(c, s[k]) : spin(c, s[k], o.extra || 0, alive);
        }));
      });
    });
    return Promise.all(all).then(() => {});
  }
  setInstant(lines: string[]) {
    this.gen++;
    this.rows.forEach((cs, r) => { const s = this.pad(lines[r]); cs.forEach((c, k) => setNow(c, s[k])); });
  }
}
