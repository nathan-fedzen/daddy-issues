import type { Game, Team } from "@/lib/model";
import { distribution, gaussian, mulberry32, scoreHistory } from "@/lib/facts/playoffs";
import { exactPicture, type Lock, type OpenState } from "./exact";

// What-if results: game key to the team that wins it.
export type Forced = Record<string, string>;

// Two teams can meet twice in a season, so the week is part of the key.
export const scenarioKey = (g: Pick<Game, "week" | "homeId" | "awayId">): string =>
  `${g.week}:${g.homeId}-${g.awayId}`;

export const DEFAULT_SIMS = 10000;
// A conditional built on fewer simulations than this is noise, not a number.
const MIN_SAMPLE = 40;
// Redraws before a what-if result is imposed by swapping the two scores.
const MAX_REDRAWS = 24;

export interface SimRun {
  sims: number;
  playoffTeams: number;
  teamIds: string[];
  // Wins on the board before any remaining game.
  baseWins: number[];
  // Unplayed regular-season games, what-ifs included, in schedule order.
  games: Game[];
  forced: Forced;
  // sims x games: 1 when the home team won.
  homeWon: Uint8Array;
  // sims x teams: 1 when the team finished inside the cut.
  made: Uint8Array;
  // sims x teams: wins added over the remaining games.
  added: Uint8Array;
}

// Same scoring model as the odds in each issue (simulatePlayoffs): every team
// draws from its own season so far, shrunk toward the league average. A what-if
// result is honoured by redrawing that game until it comes out that way, so
// the points tiebreak stays consistent with the result.
export function runSims(
  teams: Team[],
  games: Game[],
  playoffTeams: number,
  forced: Forced = {},
  sims = DEFAULT_SIMS,
  seed = 1,
): SimRun {
  const rand = mulberry32(seed);
  const remaining = games.filter((g) => !g.final).sort((a, b) => a.week - b.week);
  const scores = games.filter((g) => g.final).flatMap((g) => [g.homePoints, g.awayPoints]);
  const leagueMean = scores.length ? scores.reduce((a, b) => a + b, 0) / scores.length : 100;
  const index = new Map(teams.map((t, i) => [t.id, i]));
  const dist = teams.map((t) => distribution(scoreHistory(games, t.id), leagueMean));
  const plan = remaining
    .map((g) => ({ g, h: index.get(g.homeId), a: index.get(g.awayId) }))
    .filter((p): p is { g: Game; h: number; a: number } => p.h !== undefined && p.a !== undefined)
    .map((p) => {
      const winner = forced[scenarioKey(p.g)];
      return { ...p, want: winner === p.g.homeId ? 1 : winner === p.g.awayId ? 0 : -1 };
    });

  const n = teams.length;
  const homeWon = new Uint8Array(sims * plan.length);
  const made = new Uint8Array(sims * n);
  const added = new Uint8Array(sims * n);
  const wins = new Float64Array(n);
  const pf = new Float64Array(n);
  const order = teams.map((_, i) => i);

  for (let s = 0; s < sims; s++) {
    for (let i = 0; i < n; i++) {
      wins[i] = teams[i].wins;
      pf[i] = teams[i].pointsFor;
    }
    plan.forEach(({ h, a, want }, gi) => {
      let hs = 0;
      let as = 0;
      for (let tries = 0; tries <= MAX_REDRAWS; tries++) {
        hs = dist[h].mean + dist[h].sd * gaussian(rand);
        as = dist[a].mean + dist[a].sd * gaussian(rand);
        if (want === -1 || (hs > as ? 1 : 0) === want) break;
        if (tries === MAX_REDRAWS) [hs, as] = [as, hs];
      }
      const home = hs > as ? 1 : 0;
      homeWon[s * plan.length + gi] = home;
      pf[h] += hs;
      pf[a] += as;
      const w = home ? h : a;
      wins[w]++;
      added[s * n + w]++;
    });
    order.sort((x, y) => wins[y] - wins[x] || pf[y] - pf[x]);
    for (let k = 0; k < playoffTeams && k < n; k++) made[s * n + order[k]] = 1;
  }

  return {
    sims,
    playoffTeams,
    teamIds: teams.map((t) => t.id),
    baseWins: teams.map((t) => t.wins),
    games: plan.map((p) => p.g),
    forced,
    homeWon,
    made,
    added,
  };
}

export interface RecordRow {
  // Wins added over every remaining game, what-ifs included.
  added: number;
  left: number;
  // Share of simulations that end on this record.
  share: number;
  // Playoff odds on this record; null when too few simulations land here.
  odds: number | null;
  lock: Lock;
}

export interface GameSwing {
  key: string;
  week: number;
  homeId: string;
  awayId: string;
  own: boolean;
  // The team's playoff odds when each side wins; null on a thin sample.
  ifHome: number | null;
  ifAway: number | null;
  // Which result helps, and by how many points of odds.
  better: string | null;
  swing: number;
}

export type Status = "clinched" | "eliminated" | "alive";

export interface TeamScenario {
  teamId: string;
  status: Status;
  odds: number;
  // The team's own games not yet decided or picked.
  undecided: number;
  // See ExactPicture. Counted in the undecided games only.
  clinchWins: number | null;
  elimLosses: number | null;
  records: RecordRow[];
  // Every remaining game that is not a what-if, biggest swing first.
  swings: GameSwing[];
}

const pct = (hits: number, total: number) => Math.round((hits / total) * 1000) / 10;

export function openState(run: SimRun): OpenState {
  const wins: Record<string, number> = {};
  run.teamIds.forEach((id, i) => (wins[id] = run.baseWins[i]));
  const open: Game[] = [];
  for (const g of run.games) {
    const winner = run.forced[scenarioKey(g)];
    if (winner === g.homeId || winner === g.awayId) wins[winner]++;
    else open.push(g);
  }
  return { wins, open, playoffTeams: run.playoffTeams };
}

export function teamScenario(run: SimRun, teamId: string): TeamScenario {
  const t = run.teamIds.indexOf(teamId);
  const n = run.teamIds.length;
  const g = run.games.length;
  const state = openState(run);
  const exact = exactPicture(state, teamId);
  const mine = (x: Game) => x.homeId === teamId || x.awayId === teamId;
  const ownAll = run.games.filter(mine).length;
  const undecided = state.open.filter(mine).length;
  const picked = (state.wins[teamId] ?? 0) - (run.baseWins[t] ?? 0);

  let madeAll = 0;
  const byAdded = Array.from({ length: ownAll + 1 }, () => ({ sims: 0, made: 0 }));
  const home = run.games.map(() => ({ sims: 0, made: 0 }));
  const away = run.games.map(() => ({ sims: 0, made: 0 }));
  for (let s = 0; s < run.sims; s++) {
    const m = run.made[s * n + t];
    madeAll += m;
    const row = byAdded[run.added[s * n + t]];
    row.sims++;
    row.made += m;
    for (let i = 0; i < g; i++) {
      const side = run.homeWon[s * g + i] ? home[i] : away[i];
      side.sims++;
      side.made += m;
    }
  }

  const records: RecordRow[] = exact.rows
    .map((r) => {
      const added = picked + r.added;
      const cell = byAdded[added] ?? { sims: 0, made: 0 };
      return {
        added,
        left: ownAll - added,
        share: pct(cell.sims, run.sims),
        odds: r.lock === "in" ? 100 : r.lock === "out" ? 0 : cell.sims >= MIN_SAMPLE ? pct(cell.made, cell.sims) : null,
        lock: r.lock,
      };
    })
    .reverse();

  const swings: GameSwing[] = run.games
    .map((x, i): GameSwing | null => {
      const key = scenarioKey(x);
      if (run.forced[key]) return null;
      const ifHome = home[i].sims >= MIN_SAMPLE ? pct(home[i].made, home[i].sims) : null;
      const ifAway = away[i].sims >= MIN_SAMPLE ? pct(away[i].made, away[i].sims) : null;
      const diff = ifHome !== null && ifAway !== null ? Math.round((ifHome - ifAway) * 10) / 10 : 0;
      return {
        key,
        week: x.week,
        homeId: x.homeId,
        awayId: x.awayId,
        own: mine(x),
        ifHome,
        ifAway,
        better: diff > 0 ? x.homeId : diff < 0 ? x.awayId : null,
        swing: Math.abs(diff),
      };
    })
    .filter((x): x is GameSwing => x !== null)
    .sort((a, b) => b.swing - a.swing || a.week - b.week);

  const status: Status =
    exact.clinchWins === 0 ? "clinched" : exact.elimLosses === 0 ? "eliminated" : "alive";
  // The simulations cannot contradict the arithmetic: a team that is not
  // locked either way never shows a flat 100 or 0.
  const raw = pct(madeAll, run.sims);
  const odds = status === "clinched" ? 100 : status === "eliminated" ? 0 : Math.min(99.9, Math.max(0.1, raw));

  return {
    teamId,
    status,
    odds,
    undecided,
    clinchWins: exact.clinchWins,
    elimLosses: exact.elimLosses,
    records,
    swings,
  };
}
