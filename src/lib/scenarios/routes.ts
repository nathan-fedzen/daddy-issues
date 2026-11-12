import type { Game } from "@/lib/model";
import { scenarioKey, type Forced } from "./engine";
import { clinchWitness, eliminationWitness, escapeGroup, exactPicture, threatGroup, type OpenState } from "./exact";

export type Want = "in" | "out";

export interface Route {
  // The week after which it is settled if every result below happens.
  settledWeek: number;
  // Game key to the winner the route needs. Nothing in it is spare: take any
  // one result away and the guarantee is gone.
  results: Forced;
  // True when every earlier week was searched to the end and came up empty,
  // so no set of results settles it sooner.
  earliest: boolean;
}

export interface RouteAnswer {
  // Whether any set of results at all would settle it this way.
  possible: boolean;
  // Null with possible true means a route exists but the search gave up
  // before finding one.
  route: Route | null;
}

// Positions looked at per week before the search gives up on that week.
const BUDGET = 3000;

const involves = (g: Game, teamId: string) => g.homeId === teamId || g.awayId === teamId;
const other = (g: Game, teamId: string) => (g.homeId === teamId ? g.awayId : g.homeId);

export function applyResults(state: OpenState, results: Forced): OpenState {
  const wins = { ...state.wins };
  const open: Game[] = [];
  for (const g of state.open) {
    const winner = results[scenarioKey(g)];
    if (winner === g.homeId || winner === g.awayId) wins[winner] = (wins[winner] ?? 0) + 1;
    else open.push(g);
  }
  return { wins, open, playoffTeams: state.playoffTeams };
}

// The teams standing between this position and a settled one, judged with the
// team's undecided games going the worst way for the claim. Null means it is
// settled.
function blockers(state: OpenState, teamId: string, want: Want): string[] | null {
  if (want === "in") return threatGroup(state, teamId, new Set());
  return escapeGroup(state, teamId, new Set(state.open.filter((g) => involves(g, teamId))));
}

interface Option {
  key: string;
  winner: string;
  rank: number;
}

// Every way to break a blocking group runs through one of its members: a
// loss for one of them on the way in, a win for one of them on the way out.
function optionsFor(now: OpenState, teamId: string, want: Want, group: string[], avail: Game[], taken: Forced): Option[] {
  const members = new Set(group);
  const left: Record<string, number> = {};
  for (const g of now.open) {
    left[g.homeId] = (left[g.homeId] ?? 0) + 1;
    left[g.awayId] = (left[g.awayId] ?? 0) + 1;
  }
  // How close a member is to dropping out of the group: games it can still
  // afford to lose on the way in, wins it can still absorb on the way out.
  const room = (id: string) =>
    want === "in" ? (now.wins[id] ?? 0) + (left[id] ?? 0) : -(now.wins[id] ?? 0);
  const options: Option[] = [];
  for (const g of avail) {
    const key = scenarioKey(g);
    if (taken[key]) continue;
    for (const id of [g.homeId, g.awayId]) {
      if (!members.has(id)) continue;
      const opp = other(g, id);
      const winner = want === "in" ? opp : id;
      // A result between two members costs one of them either way, so it
      // sorts behind results that only cost the group.
      options.push({ key, winner, rank: room(id) + (members.has(opp) ? 0.5 : 0) });
    }
  }
  return options.sort((a, b) => a.rank - b.rank);
}

function search(
  state: OpenState,
  teamId: string,
  want: Want,
  avail: Game[],
  results: Forced,
  budget: { left: number },
  dead: Set<string>,
): boolean {
  // The same set of results is reachable in many orders; fail it once.
  const seen = Object.entries(results).map(([k, w]) => k + ">" + w).sort().join("|");
  if (dead.has(seen)) return false;
  if (budget.left-- <= 0) return false;
  const now = applyResults(state, results);
  const group = blockers(now, teamId, want);
  if (group === null) return true;
  for (const opt of optionsFor(now, teamId, want, group, avail, results)) {
    results[opt.key] = opt.winner;
    if (search(state, teamId, want, avail, results, budget, dead)) return true;
    delete results[opt.key];
    if (budget.left <= 0) return false;
  }
  dead.add(seen);
  return false;
}

function settled(state: OpenState, teamId: string, want: Want, results: Forced): boolean {
  return blockers(applyResults(state, results), teamId, want) === null;
}

// Drops every result the guarantee survives without, other teams' games
// before the team's own, latest first.
function trim(state: OpenState, teamId: string, want: Want, results: Forced, games: Game[]): Forced {
  const kept = { ...results };
  const order = games
    .filter((g) => kept[scenarioKey(g)])
    .sort((a, b) => Number(involves(a, teamId)) - Number(involves(b, teamId)) || b.week - a.week);
  for (const g of order) {
    const key = scenarioKey(g);
    const winner = kept[key];
    delete kept[key];
    if (!settled(state, teamId, want, kept)) kept[key] = winner;
  }
  return kept;
}

// The soonest this team can be locked in (or out) and one set of results
// that does it, using only games up to that week. Later weeks are left to go
// however they like.
export function quickestRoute(state: OpenState, teamId: string, want: Want): RouteAnswer {
  const witness = want === "in" ? clinchWitness(state, teamId) : eliminationWitness(state, teamId);
  if (witness === null) return { possible: false, route: null };
  const possible = true;
  const weeks = [...new Set(state.open.map((g) => g.week))].sort((a, b) => a - b);
  if (settled(state, teamId, want, {})) {
    return { possible, route: { settledWeek: (weeks[0] ?? 1) - 1, results: {}, earliest: true } };
  }
  let earliest = true;
  for (const week of weeks) {
    const through = state.open.filter((g) => g.week <= week);
    const results: Forced = {};
    for (const g of through) {
      if (involves(g, teamId)) results[scenarioKey(g)] = want === "in" ? teamId : other(g, teamId);
    }
    const avail = through.filter((g) => !involves(g, teamId));
    const budget = { left: BUDGET };
    if (search(state, teamId, want, avail, results, budget, new Set())) {
      const trimmed = trim(state, teamId, want, results, through);
      const picture = exactPicture(applyResults(state, trimmed), teamId);
      const holds = want === "in" ? picture.clinchWins === 0 : picture.elimLosses === 0;
      if (holds) {
        const last = through.filter((g) => trimmed[scenarioKey(g)]).reduce((m, g) => Math.max(m, g.week), 0);
        return { possible, route: { settledWeek: last, results: trimmed, earliest: earliest && last === week } };
      }
    }
    if (budget.left <= 0) earliest = false;
  }
  // Last resort for the long shots: start from the teams that have to be
  // held down (or pushed up) for it to be possible at all, and have each of
  // them lose (or win) every game against the rest of the league.
  const members = new Set(witness);
  const results: Forced = {};
  for (const g of state.open) {
    const key = scenarioKey(g);
    if (involves(g, teamId)) results[key] = want === "in" ? teamId : other(g, teamId);
    else if (members.has(g.homeId) !== members.has(g.awayId)) {
      const member = members.has(g.homeId) ? g.homeId : g.awayId;
      results[key] = want === "in" ? other(g, member) : member;
    }
  }
  const avail = state.open.filter((g) => !involves(g, teamId));
  if (search(state, teamId, want, avail, results, { left: BUDGET }, new Set())) {
    const trimmed = trim(state, teamId, want, results, state.open);
    const last = state.open.filter((g) => trimmed[scenarioKey(g)]).reduce((m, g) => Math.max(m, g.week), 0);
    return { possible, route: { settledWeek: last, results: trimmed, earliest: false } };
  }
  return { possible, route: null };
}
