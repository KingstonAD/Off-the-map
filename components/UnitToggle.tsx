'use client';
import { useUnit } from '@/lib/client';

/** KM ⇄ MI switch. Shows the current unit; a tap flips it everywhere. */
export function UnitToggle() {
  const [unit, setUnit] = useUnit();
  const next = unit === 'km' ? 'mi' : 'km';
  return (
    <button
      className="otm-icon-btn"
      style={{ width: 'auto', padding: '0 8px', fontSize: 11, letterSpacing: '.08em' }}
      aria-label={`Distances in ${unit === 'km' ? 'kilometres' : 'miles'}. Switch to ${next === 'km' ? 'kilometres' : 'miles'}`}
      title="Switch distance unit"
      onClick={() => setUnit(next)}
    >
      {unit.toUpperCase()}
    </button>
  );
}
