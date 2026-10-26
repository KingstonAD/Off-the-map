/* Flight calendar. Flights unlock at 12:00 AM America/New_York. Dates are ISO strings (YYYY-MM-DD) in ET. */

import launch from '@/data/launch.json';

/** Flight #1's date. Change it with `npm run relaunch`, which also re-dates the flight files. */
export const LAUNCH_DATE: string = launch.launch;
const TZ = 'America/New_York';

function etParts(d: Date) {
  const p: Record<string, number> = {};
  new Intl.DateTimeFormat('en-US', {
    timeZone: TZ, year: 'numeric', month: 'numeric', day: 'numeric',
    hour: 'numeric', minute: 'numeric', second: 'numeric', hourCycle: 'h23',
  }).formatToParts(d).forEach((x) => { if (x.type !== 'literal') p[x.type] = +x.value; });
  return p;
}

/** The ET calendar date for an instant. */
export function etDate(d: Date = new Date()): string {
  const p = etParts(d);
  return `${p.year}-${String(p.month).padStart(2, '0')}-${String(p.day).padStart(2, '0')}`;
}

/** Seconds until the next 12:00 AM America/New_York. */
export function secsToNextFlight(d: Date = new Date()): number {
  const p = etParts(d);
  return 86400 - ((p.hour % 24) * 3600 + p.minute * 60 + p.second);
}

export function addDays(date: string, n: number): string {
  const t = Date.UTC(+date.slice(0, 4), +date.slice(5, 7) - 1, +date.slice(8, 10)) + n * 86400_000;
  return new Date(t).toISOString().slice(0, 10);
}

export function daysBetween(a: string, b: string): number {
  const ta = Date.UTC(+a.slice(0, 4), +a.slice(5, 7) - 1, +a.slice(8, 10));
  const tb = Date.UTC(+b.slice(0, 4), +b.slice(5, 7) - 1, +b.slice(8, 10));
  return Math.round((tb - ta) / 86400_000);
}

/** Flight number = days since 2026-10-27 + 1. */
export function flightNumberFor(date: string): number {
  return daysBetween(LAUNCH_DATE, date) + 1;
}

const DOW = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
const MON = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
const DOW_LONG = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const MON_LONG = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function ymd(date: string) {
  const d = new Date(Date.UTC(+date.slice(0, 4), +date.slice(5, 7) - 1, +date.slice(8, 10)));
  return { dow: d.getUTCDay(), mon: d.getUTCMonth(), day: d.getUTCDate(), yy: String(d.getUTCFullYear()).slice(2) };
}
/** "WED 28 OCT" */
export const boardDate = (date: string) => { const x = ymd(date); return `${DOW[x.dow]} ${x.day} ${MON[x.mon]}`; };
/** "27 OCT" */
export const shortDate = (date: string) => { const x = ymd(date); return `${x.day} ${MON[x.mon]}`; };
/** "27 Oct 26" */
export const stampDate = (date: string) => { const x = ymd(date); return `${x.day} ${MON_LONG[x.mon]} ${x.yy}`; };
/** "Tuesday, Oct 27" */
export const longDate = (date: string) => { const x = ymd(date); return `${DOW_LONG[x.dow]}, ${MON_LONG[x.mon]} ${x.day}`; };

export function hms(s: number): string {
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), x = s % 60;
  return [h, m, x].map((v) => String(v).padStart(2, '0')).join(':');
}
