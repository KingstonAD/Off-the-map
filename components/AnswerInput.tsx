'use client';
import { useEffect, useRef, useState } from 'react';
import { normalize, resolve, type PoolEntry, type PoolName } from '@/lib/pools';

type Props = {
  pool: PoolName;
  disabled: boolean;
  /** Called with a recognised pool entry. Text that isn't in the pool is never submitted. */
  onPick: (e: PoolEntry) => void;
};

const ROWS = ['QWERTYUIOP', 'ASDFGHJKL', 'ZXCVBNM'];

/** What the input is showing below the field: nothing, a "Did you mean" check, or a "not sure" note. */
type Check = { kind: 'none' } | { kind: 'close'; options: PoolEntry[] } | { kind: 'unknown' };

/**
 * Free-text answer field + the terminal keyboard on touch screens. On Stamp / Enter the text is resolved against the
 * whole pool (never the valid answers): an exact name or alias stamps at once, a near miss asks "Did you mean…?",
 * and anything else asks the player to try again. None of it hints at what's correct, and the gate keeps closing.
 */
export function AnswerInput({ pool, disabled, onPick }: Props) {
  const [value, setValue] = useState('');
  const [check, setCheck] = useState<Check>({ kind: 'none' });
  const [touch, setTouch] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const firstChoice = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const coarse = window.matchMedia?.('(pointer: coarse)').matches ?? false;
    setTouch(coarse);
    if (!coarse) input.current?.focus();
  }, []);

  // Keyboard players land on the first choice, so Enter answers "Yes".
  useEffect(() => { if (check.kind === 'close') firstChoice.current?.focus(); }, [check]);

  const type = (v: string) => { setValue(v); setCheck({ kind: 'none' }); };
  const pick = (e: PoolEntry) => {
    if (disabled) return;
    setValue(e.name);
    setCheck({ kind: 'none' });
    onPick(e);
  };
  const back = () => {
    setCheck({ kind: 'none' });
    if (!touch) input.current?.focus();
  };

  const stamp = () => {
    if (disabled || !normalize(value)) return;
    const r = resolve(pool, value);
    if (r.kind === 'exact') pick(r.entry);
    else setCheck(r);
  };

  const tapKey = (k: string) => {
    if (disabled) return;
    type(k === 'BK' ? value.slice(0, -1) : value + (k === 'SP' ? ' ' : k));
  };

  return (
    <>
      <form className="otm-input" autoComplete="off" onSubmit={(e) => { e.preventDefault(); stamp(); }}>
        <input
          ref={input}
          value={value}
          onChange={(e) => type(e.target.value)}
          placeholder="Type your answer"
          aria-label="Your answer"
          aria-describedby="otm-check"
          spellCheck={false}
          autoCapitalize="characters"
          autoCorrect="off"
          inputMode={touch ? 'none' : 'text'}
          disabled={disabled}
          maxLength={40}
        />
        <button className="go" type="submit" disabled={disabled || !normalize(value)}>STAMP</button>
      </form>
      <div id="otm-check" aria-live="polite">
        {check.kind === 'close' && (
          <div className="otm-suggest" role="group" aria-label="Confirm your answer">
            {check.options.length === 1 ? (
              <>
                <div className="otm-ask">Did you mean <b>{check.options[0].name}</b>?</div>
                <button ref={firstChoice} type="button" onClick={() => pick(check.options[0])} disabled={disabled}>Yes<span>Return ↵</span></button>
              </>
            ) : (
              <>
                <div className="otm-ask">Did you mean…</div>
                {check.options.map((o, i) => (
                  <button key={o.id} ref={i === 0 ? firstChoice : undefined} type="button" onClick={() => pick(o)} disabled={disabled}>{o.name}</button>
                ))}
              </>
            )}
            <button type="button" onClick={back} disabled={disabled}>No<span>Back to typing</span></button>
          </div>
        )}
        {check.kind === 'unknown' && <p className="otm-note otm-unsure">Not sure what that is. Try again.</p>}
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
