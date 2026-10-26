import Link from 'next/link';
import type { CSSProperties } from 'react';

type Props = {
  small: string;
  strong: string;
  stubLabel?: string;
  stubCode?: string;
  barcode?: boolean;
  amber?: boolean;
  slim?: boolean;
  href?: string;
  onClick?: () => void;
  disabled?: boolean;
  ariaLabel?: string;
  style?: CSSProperties;
};

/** Primary actions are boarding passes: main field + perforated stub, half-moon notches at the perforation. */
export function BoardingPass({ small, strong, stubLabel, stubCode, barcode, amber, slim, href, onClick, disabled, ariaLabel, style }: Props) {
  const cls = `otm-pass${amber ? ' amber' : ''}${slim ? ' slim' : ''}`;
  const inner = (
    <>
      <span className="main" style={slim ? { padding: '10px 16px' } : undefined}>
        <small>{small}</small>
        <strong>{strong}</strong>
      </span>
      {stubLabel !== undefined && (
        <span className="stub" style={slim ? { padding: '10px 10px 8px 12px' } : undefined}>
          <small>{stubLabel}</small>
          <b>{stubCode}</b>
          {barcode && <span className="otm-barcode" />}
        </span>
      )}
    </>
  );
  if (href && !disabled) {
    return <Link href={href} className={cls} aria-label={ariaLabel} style={style}>{inner}</Link>;
  }
  return <button type="button" className={cls} aria-label={ariaLabel} onClick={onClick} disabled={disabled} style={style}>{inner}</button>;
}
