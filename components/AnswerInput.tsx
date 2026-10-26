'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import { search, type PoolEntry, type PoolName } from '@/lib/pools';

type Props = {
  pool: PoolName;
  disabled: boolean;
  /** Called with the picked pool entry. Free text can never be submitted. */
  onPick: (e: PoolEntry) => void;
};

const ROWS = ['QWERTYUIOP', 'ASDFGHJKL', 'ZXCVBNM'];

/** Answer field + autocomplete over the whole pool (never the valid answers) + the terminal keyboard on touch screens. */
export function AnswerInput({ pool, disabled, onPick }: Props) {
  const [value, setValue] = useState('');
  const [sel, setSel] = useState(0);
  const [touch, setTouch] = useState(false);
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const coarse = window.matchMedia?.('(pointer: coarse)').matches ?? false;
    setTouch(coarse);
    if (!coarse) input.current?.focus();
  }, []);

  const matches = useMemo(() => search(pool, value, touch ? 3 : 4), [pool, value, touch]);
  const current = matches[Math.min(sel, matches.length - 1)];

  const type = (v: string) => { setValue(v); setSel(0); };
  const pick = (e: PoolEntry | undefined) => {
    if (!e || disabled) return;
    setValue(e.name);
    onPick(e);
  };

  const onKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') { setSel((s) => Math.min(s + 1, matches.length - 1)); e.preventDefault(); }
    else if (e.key === 'ArrowUp') { setSel((s) => Math.max(s - 1, 0)); e.preventDefault(); }
    else if (e.key === 'Tab' && current) { setValue(current.entry.name); setSel(0); e.preventDefault(); }
  };

  const tapKey = (k: string) => {
    if (disabled) return;
    type(k === 'BK' ? value.slice(0, -1) : value + (k === 'SP' ? ' ' : k));
  };

  return (
    <>
      <form className="otm-input" autoComplete="off" onSubmit={(e) => { e.preventDefault(); pick(current?.entry); }}>
        <input
          ref={input}
          value={value}
          onChange={(e) => type(e.target.value)}
          onKeyDown={onKey}
          placeholder="Type your answer"
          aria-label="Your answer"
          aria-autocomplete="list"
          aria-controls="otm-suggest"
          aria-activedescendant={current ? `sug-${current.entry.id}` : undefined}
          spellCheck={false}
          autoCapitalize="characters"
          autoCorrect="off"
          inputMode={touch ? 'none' : 'text'}
          disabled={disabled}
          maxLength={40}
        />
        <button className="go" type="submit" disabled={disabled || !current}>STAMP</button>
      </form>
      <div className="otm-suggest" id="otm-suggest" role="listbox" aria-label="Suggestions" style={{ display: matches.length ? undefined : 'none' }}>
        {matches.map((m, i) => {
          const on = m === current;
          return (
            <button
              key={m.entry.id}
              id={`sug-${m.entry.id}`}
              type="button"
              role="option"
              aria-selected={on}
              className={on ? 'on' : ''}
              onClick={() => pick(m.entry)}
              disabled={disabled}
            >
              <span style={{ font: 'inherit', color: 'inherit', letterSpacing: 'inherit', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                <Highlight text={m.entry.name} query={m.via ? '' : value} />
                {m.via && <span className="via">aka {m.via}</span>}
              </span>
              {on && <span>Return ↵</span>}
            </button>
          );
        })}
      </div>
      {touch && (
        <div className="otm-kb" aria-hidden="true">
          {ROWS.map((r, i) => (
            <div className="k-row" key={r}>
              {i === 2 && <button type="button" tabIndex={-1} className="wide" onClick={() => tapKey('SP')}>space</button>}
              {r.split('').map((k) => <button type="button" tabIndex={-1} key={k} onClick={() => tapKey(k)}>{k}</button>)}
              {i === 2 && <button type="button" tabIndex={-1} className="wide" onClick={() => tapKey('BK')}>⌫</button>}
            </div>
          ))}
        </div>
      )}
    </>
  );
}

/** Amber-marks the typed prefix, as in the design. */
function Highlight({ text, query }: { text: string; query: string }) {
  const q = query.trim();
  if (q && text.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').startsWith(q.toLowerCase())) {
    return <><mark>{text.slice(0, q.length)}</mark>{text.slice(q.length)}</>;
  }
  return <>{text}</>;
}
