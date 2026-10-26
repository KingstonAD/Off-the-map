import Link from 'next/link';

/** Paper luggage tag for small personal counters (streak). Terminal surfaces only. Values ≤ 8 characters. */
export function LuggageTag({ label, value, amber, href }: { label: string; value: string; amber?: boolean; href: string }) {
  return (
    <span className="otm-tag-wrap">
      <Link href={href} className={`otm-tag${amber ? ' amber' : ''}`} aria-label={`${label}: ${value}`}>
        <span><small>{label}</small><br /><b>{value}</b></span>
      </Link>
    </span>
  );
}
