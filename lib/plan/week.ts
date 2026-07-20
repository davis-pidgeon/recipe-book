function atUtcMidnight(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

export function mondayOf(date: Date): Date {
  const d = atUtcMidnight(date);
  const day = d.getUTCDay(); // 0=Sun..6=Sat
  const diff = (day + 6) % 7; // days since Monday
  d.setUTCDate(d.getUTCDate() - diff);
  return d;
}

export function weekKey(monday: Date): string {
  return atUtcMidnight(monday).toISOString().slice(0, 10);
}

export function parseWeekKey(key: string): Date {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(key);
  if (!m) return mondayOf(new Date());
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const dd = Number(m[3]);
  const d = new Date(Date.UTC(y, mo - 1, dd));
  // Validate that the date round-trips; calendar-invalid values like month 13 or day 0 roll over
  if (d.getUTCFullYear() !== y || d.getUTCMonth() !== mo - 1 || d.getUTCDate() !== dd) {
    return mondayOf(new Date());
  }
  return mondayOf(d);
}

export function addWeeks(monday: Date, n: number): Date {
  const d = atUtcMidnight(monday);
  d.setUTCDate(d.getUTCDate() + n * 7);
  return d;
}

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

export function formatWeekRange(monday: Date): string {
  const start = atUtcMidnight(monday);
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 6);
  const sM = MONTHS[start.getUTCMonth()];
  const eM = MONTHS[end.getUTCMonth()];
  const sD = start.getUTCDate();
  const eD = end.getUTCDate();
  return sM === eM ? `${sM} ${sD} – ${eD}` : `${sM} ${sD} – ${eM} ${eD}`;
}
