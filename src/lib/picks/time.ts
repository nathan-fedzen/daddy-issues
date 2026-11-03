import { league } from "@/config/league";

export interface PickSchedule {
  // Thursday of NFL week 1, as YYYY-MM-DD.
  weekOneThursday: string;
  firstWeek: number;
  lastWeek: number;
  // Denver wall-clock hour on Thursday when the week's picks lock.
  lockHour: number;
}

export interface PickWindow {
  week: number;
  opensAt: Date;
  lockAt: Date;
  closesAt: Date;
  open: boolean;
}

const ZONE = "America/Denver";
const WEEK_MS = 7 * 86_400_000;

const clock = new Intl.DateTimeFormat("en-US", {
  timeZone: ZONE,
  hourCycle: "h23",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
});

function offsetMinutes(at: Date): number {
  const p = Object.fromEntries(clock.formatToParts(at).map((x) => [x.type, x.value]));
  const wall = Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour, +p.minute, +p.second);
  return Math.round((wall - at.getTime()) / 60_000);
}

// The instant at which a Denver wall clock reads the given date and hour.
// Two passes so a date on the far side of a DST change gets that side's offset.
export function denver(y: number, m: number, d: number, hour = 0): Date {
  const wall = Date.UTC(y, m - 1, d, hour);
  const first = wall - offsetMinutes(new Date(wall)) * 60_000;
  return new Date(wall - offsetMinutes(new Date(first)) * 60_000);
}

function shift(iso: string, days: number): [number, number, number] {
  const [y, m, d] = iso.split("-").map(Number);
  const t = new Date(Date.UTC(y, m - 1, d + days));
  return [t.getUTCFullYear(), t.getUTCMonth() + 1, t.getUTCDate()];
}

// A pick week runs Tuesday to Tuesday (Denver) around its Thursday kickoff.
export function pickWindowFor(week: number, s: PickSchedule = league.picks): Omit<PickWindow, "open"> {
  const tuesday = (w: number) => denver(...shift(s.weekOneThursday, 7 * (w - 1) - 2));
  return {
    week,
    opensAt: tuesday(week),
    lockAt: denver(...shift(s.weekOneThursday, 7 * (week - 1)), s.lockHour),
    closesAt: tuesday(week + 1),
  };
}

export function pickWindow(now = new Date(), s: PickSchedule = league.picks): PickWindow {
  const first = pickWindowFor(1, s).opensAt;
  const guess = Math.floor((now.getTime() - first.getTime()) / WEEK_MS) + 1;
  const week = Math.min(Math.max(guess, 1), s.lastWeek);
  let w = pickWindowFor(week, s);
  if (now < w.opensAt && week > 1) w = pickWindowFor(week - 1, s);
  else if (now >= w.closesAt && week < s.lastWeek) w = pickWindowFor(week + 1, s);
  return { ...w, open: now >= w.opensAt && now < w.lockAt };
}

const lockFormat = new Intl.DateTimeFormat("en-US", {
  timeZone: ZONE,
  weekday: "long",
  hour: "numeric",
  minute: "2-digit",
});

export function lockLabel(at: Date): string {
  return lockFormat.format(at);
}
