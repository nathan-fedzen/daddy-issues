import { chugListOf, gamesOf, robotOf, type Facts, type GameFact, type TeamRef } from "@/lib/facts";
import { round } from "@/lib/facts/lineup";

// Everything here reads the facts stored on published issues, so the season
// pages need no ESPN call and stay consistent with what each issue printed.

export interface WeekFacts {
  week: number;
  facts: Facts;
  // False for backfilled weeks with no newsletter; the chug rule only
  // applies to weeks that were actually written up.
  hasIssue?: boolean;
}

export function byWeek(issues: WeekFacts[]): WeekFacts[] {
  return [...issues].sort((a, b) => a.week - b.week);
}

export function latestOf(issues: WeekFacts[]): WeekFacts | null {
  const sorted = byWeek(issues);
  return sorted[sorted.length - 1] ?? null;
}

interface Tally extends TeamRef {
  count: number;
}

export interface Shame {
  benchPoints: (TeamRef & { total: number; gamesCost: number; weeks: number })[];
  lowestWeeks: (TeamRef & { week: number; points: number })[];
  worstSwaps: (TeamRef & { week: number; benched: string; started: string; gain: number; costTheGame: boolean })[];
  blowouts: { week: number; winner: TeamRef; loser: TeamRef; margin: number }[];
  dropReadds: Tally[];
  chugs: Tally[];
  losingStreaks: (TeamRef & { length: number; from: number; to: number; alive: boolean })[];
}

const TOP = 3;

function tally(entries: TeamRef[]): Tally[] {
  const map = new Map<string, Tally>();
  for (const e of entries) {
    const cur = map.get(e.teamId) ?? { teamId: e.teamId, teamName: e.teamName, owner: e.owner, count: 0 };
    cur.count++;
    map.set(e.teamId, cur);
  }
  return [...map.values()].sort((a, b) => b.count - a.count || a.owner.localeCompare(b.owner));
}

function refOf(x: TeamRef): TeamRef {
  return { teamId: x.teamId, teamName: x.teamName, owner: x.owner };
}

export function hallOfShame(issues: WeekFacts[]): Shame {
  const weeks = byWeek(issues);
  const bench = new Map<string, Shame["benchPoints"][number]>();
  const lowest: Shame["lowestWeeks"] = [];
  const swaps: Shame["worstSwaps"] = [];
  const blowouts: Shame["blowouts"] = [];
  const readds: TeamRef[] = [];
  const chugs: TeamRef[] = [];
  const seenReadd = new Set<string>();

  for (const { week, facts, hasIssue } of weeks) {
    for (const l of facts.lineups ?? []) {
      const cur = bench.get(l.teamId) ?? { ...refOf(l), total: 0, gamesCost: 0, weeks: 0 };
      cur.total = round(cur.total + l.pointsLeft);
      cur.gamesCost += l.wouldHaveWon ? 1 : 0;
      cur.weeks++;
      bench.set(l.teamId, cur);
      if (l.worstSwap) {
        swaps.push({
          ...refOf(l),
          week,
          benched: l.worstSwap.benched.name,
          started: l.worstSwap.started.name,
          gain: l.worstSwap.gain,
          costTheGame: l.wouldHaveWon && l.actual + l.worstSwap.gain > l.opponentPoints,
        });
      }
    }
    for (const r of facts.results ?? []) {
      lowest.push({ ...refOf(r.loser), week, points: r.loser.points });
      lowest.push({ ...refOf(r.winner), week, points: r.winner.points });
      blowouts.push({ week, winner: refOf(r.winner), loser: refOf(r.loser), margin: r.margin });
    }
    for (const d of facts.transactions?.dropReadds ?? []) {
      // Adjacent issues share part of the 7-day transaction window.
      const key = `${d.teamId}:${d.playerName}:${d.droppedOn}`;
      if (seenReadd.has(key)) continue;
      seenReadd.add(key);
      readds.push(refOf(d));
    }
    if (hasIssue !== false) for (const c of chugListOf(facts)) chugs.push(refOf(c));
  }

  return {
    benchPoints: [...bench.values()].sort((a, b) => b.total - a.total),
    lowestWeeks: lowest.sort((a, b) => a.points - b.points).slice(0, TOP),
    worstSwaps: swaps.sort((a, b) => b.gain - a.gain).slice(0, TOP),
    blowouts: blowouts.sort((a, b) => b.margin - a.margin).slice(0, TOP),
    dropReadds: tally(readds),
    chugs: tally(chugs),
    losingStreaks: losingStreaks(weeks),
  };
}

type Outcome = { week: number; won: boolean };
type Run = { length: number; from: number; to: number };

// Finished games on the latest issue cover the whole season; without them,
// fall back to each issue's own results, which may skip unpublished weeks.
function outcomes(weeks: WeekFacts[]): Map<string, { ref: TeamRef; games: Outcome[] }> {
  const out = new Map<string, { ref: TeamRef; games: Outcome[] }>();
  const latest = weeks[weeks.length - 1];
  if (!latest) return out;
  const refs = new Map<string, TeamRef>();
  for (const w of weeks) for (const t of w.facts.teams) refs.set(t.teamId, refOf(t));
  const add = (teamId: string, o: Outcome) => {
    const ref = refs.get(teamId);
    if (!ref) return;
    const cur = out.get(teamId) ?? { ref, games: [] };
    cur.games.push(o);
    out.set(teamId, cur);
  };
  const games = gamesOf(latest.facts);
  if (games.length) {
    for (const g of games) {
      if (g.homePoints === g.awayPoints) continue;
      add(g.homeId, { week: g.week, won: g.homePoints > g.awayPoints });
      add(g.awayId, { week: g.week, won: g.awayPoints > g.homePoints });
    }
  } else {
    for (const w of weeks) {
      for (const r of w.facts.results) {
        if (r.tie) continue;
        add(r.winner.teamId, { week: w.week, won: true });
        add(r.loser.teamId, { week: w.week, won: false });
      }
    }
  }
  for (const v of out.values()) v.games.sort((a, b) => a.week - b.week);
  return out;
}

export function losingStreaks(weeks: WeekFacts[]): Shame["losingStreaks"] {
  const rows: Shame["losingStreaks"] = [];
  for (const { ref, games } of outcomes(weeks).values()) {
    let best: Run | null = null;
    let run: Run | null = null;
    for (const g of games) {
      if (g.won) {
        run = null;
        continue;
      }
      const next: Run = run ? { length: run.length + 1, from: run.from, to: g.week } : { length: 1, from: g.week, to: g.week };
      run = next;
      if (!best || next.length > best.length) best = next;
    }
    const alive = run !== null && best !== null && run.length === best.length;
    if (best && best.length >= 2) rows.push({ ...ref, length: best.length, from: best.from, to: best.to, alive });
  }
  return rows.sort((a, b) => b.length - a.length || a.from - b.from);
}

export interface OddsHistory extends TeamRef {
  points: { week: number; odds: number }[];
  current: number;
  change: number;
}

export function oddsHistory(issues: WeekFacts[]): OddsHistory[] {
  const weeks = byWeek(issues);
  const map = new Map<string, OddsHistory>();
  for (const { week, facts } of weeks) {
    for (const o of facts.playoffs?.odds ?? []) {
      const cur = map.get(o.teamId) ?? { ...refOf(o), points: [], current: 0, change: 0 };
      cur.points.push({ week, odds: o.odds });
      map.set(o.teamId, cur);
    }
  }
  return [...map.values()]
    .map((h) => {
      const last = h.points[h.points.length - 1]?.odds ?? 0;
      const prev = h.points[h.points.length - 2]?.odds ?? last;
      return { ...h, current: last, change: round(last - prev) };
    })
    .sort((a, b) => b.current - a.current || a.owner.localeCompare(b.owner));
}

export interface WinLoss {
  wins: number;
  losses: number;
}

export interface ScheduleSwapRow extends TeamRef {
  actual: WinLoss;
  // The record this team would hold with each other team's schedule, keyed
  // by whose schedule it is.
  withSchedule: Record<string, WinLoss>;
  best: WinLoss;
  worst: WinLoss;
  // How many of the other schedules would have given this team a better
  // record than it has, and how many a worse one.
  betterSchedules: number;
  worseSchedules: number;
}

export function scheduleSwap(games: GameFact[], teams: TeamRef[]): ScheduleSwapRow[] {
  const score = new Map<string, number>();
  const opponent = new Map<string, string>();
  const weeks = new Set<number>();
  for (const g of games) {
    weeks.add(g.week);
    score.set(`${g.week}:${g.homeId}`, g.homePoints);
    score.set(`${g.week}:${g.awayId}`, g.awayPoints);
    opponent.set(`${g.week}:${g.homeId}`, g.awayId);
    opponent.set(`${g.week}:${g.awayId}`, g.homeId);
  }
  const recordWith = (teamId: string, scheduleOf: string): WinLoss => {
    const rec = { wins: 0, losses: 0 };
    for (const week of weeks) {
      const mine = score.get(`${week}:${teamId}`);
      let opp = opponent.get(`${week}:${scheduleOf}`);
      if (mine === undefined || opp === undefined) continue;
      if (opp === teamId) opp = scheduleOf;
      const theirs = score.get(`${week}:${opp}`);
      if (theirs === undefined || mine === theirs) continue;
      if (mine > theirs) rec.wins++;
      else rec.losses++;
    }
    return rec;
  };
  const better = (a: WinLoss, b: WinLoss) => a.wins - a.losses > b.wins - b.losses;
  return teams.map((t) => {
    const actual = recordWith(t.teamId, t.teamId);
    const withSchedule: Record<string, WinLoss> = {};
    let best = actual;
    let worst = actual;
    let betterSchedules = 0;
    let worseSchedules = 0;
    for (const o of teams) {
      const rec = recordWith(t.teamId, o.teamId);
      withSchedule[o.teamId] = rec;
      if (o.teamId === t.teamId) continue;
      if (better(rec, best)) best = rec;
      if (better(worst, rec)) worst = rec;
      if (better(rec, actual)) betterSchedules++;
      if (better(actual, rec)) worseSchedules++;
    }
    return { ...refOf(t), actual, withSchedule, best, worst, betterSchedules, worseSchedules };
  });
}

export interface RobotTally extends TeamRef {
  weeks: { week: number; actual: number; robot: number; diff: number; actualWon: boolean; robotWon: boolean }[];
  humanWins: number;
  robotWins: number;
  net: number;
  robotAhead: number;
}

export function robotTally(issues: WeekFacts[]): RobotTally[] {
  const map = new Map<string, RobotTally>();
  for (const { week, facts } of byWeek(issues)) {
    for (const r of robotOf(facts)) {
      const cur = map.get(r.teamId) ?? { ...refOf(r), weeks: [], humanWins: 0, robotWins: 0, net: 0, robotAhead: 0 };
      cur.weeks.push({ week, actual: r.actual, robot: r.robot, diff: r.diff, actualWon: r.actualWon, robotWon: r.robotWon });
      cur.humanWins += r.actualWon ? 1 : 0;
      cur.robotWins += r.robotWon ? 1 : 0;
      cur.net = round(cur.net + r.diff);
      cur.robotAhead += r.diff > 0 ? 1 : 0;
      map.set(r.teamId, cur);
    }
  }
  return [...map.values()].sort((a, b) => b.net - a.net);
}
