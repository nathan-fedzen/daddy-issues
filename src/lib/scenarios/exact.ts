import type { Game } from "@/lib/model";

// The guaranteed half of the scenarios page: results that hold in every
// possible outcome of the remaining games, not just in the simulations.
// Ties in the standings are broken by points, which nobody can know yet, so a
// tie always counts against the claim being made: a team is only locked in if
// too few others can even match its wins, and only locked out if enough others
// finish strictly ahead whatever happens.

export interface OpenState {
  // Wins on the board, including any what-if results already applied.
  wins: Record<string, number>;
  // Games still to be decided.
  open: Game[];
  playoffTeams: number;
}

// Each pair is a game between two teams (by index); a team can take at most
// cap[i] of its games. Returns how many games can be handed out.
function maxAssign(pairs: [number, number][], cap: number[]): number {
  const held: number[][] = cap.map(() => []);
  const give = (g: number, seen: Uint8Array): boolean => {
    for (const c of pairs[g]) {
      if (seen[c] || cap[c] <= 0) continue;
      seen[c] = 1;
      if (held[c].length < cap[c]) {
        held[c].push(g);
        return true;
      }
      for (let k = 0; k < held[c].length; k++) {
        if (give(held[c][k], seen)) {
          held[c][k] = g;
          return true;
        }
      }
    }
    return false;
  };
  let n = 0;
  for (let g = 0; g < pairs.length; g++) if (give(g, new Uint8Array(cap.length))) n++;
  return n;
}

function* subsets<T>(items: T[], size: number, from = 0, acc: T[] = []): Generator<T[]> {
  if (acc.length === size) {
    yield acc;
    return;
  }
  for (let i = from; i <= items.length - (size - acc.length); i++) {
    acc.push(items[i]);
    yield* subsets(items, size, i + 1, acc);
    acc.pop();
  }
}

interface Field {
  target: number;
  others: string[];
  base: Record<string, number>;
  free: Game[];
}

// The league from one team's side once its own remaining results are fixed.
function fieldFor(state: OpenState, teamId: string, ownWins: Set<Game>): Field {
  const base = { ...state.wins };
  const free: Game[] = [];
  for (const g of state.open) {
    if (g.homeId !== teamId && g.awayId !== teamId) free.push(g);
    else if (ownWins.has(g)) base[teamId] = (base[teamId] ?? 0) + 1;
    else {
      const opp = g.homeId === teamId ? g.awayId : g.homeId;
      base[opp] = (base[opp] ?? 0) + 1;
    }
  }
  return { target: base[teamId] ?? 0, others: Object.keys(state.wins).filter((id) => id !== teamId), base, free };
}

// A set of `count` other teams that can all finish on `floor` wins or more.
// Teams already there count without being listed, so an empty array means it
// is true whatever happens. Null means no such set exists.
function reachGroup(field: Field, floor: number, count: number): string[] | null {
  const { others, base, free } = field;
  const left: Record<string, number> = {};
  for (const g of free) {
    left[g.homeId] = (left[g.homeId] ?? 0) + 1;
    left[g.awayId] = (left[g.awayId] ?? 0) + 1;
  }
  const already = others.filter((id) => base[id] >= floor).length;
  const reach = others.filter((id) => base[id] < floor && base[id] + (left[id] ?? 0) >= floor);
  const needed = count - already;
  if (needed <= 0) return [];
  if (reach.length < needed) return null;
  for (const group of subsets(reach, needed)) {
    const index = new Map(group.map((id, i) => [id, i]));
    const cap = group.map((id) => floor - base[id]);
    const pairs: [number, number][] = [];
    for (const g of free) {
      const h = index.get(g.homeId);
      const a = index.get(g.awayId);
      if (h === undefined && a === undefined) continue;
      // A team outside the group can never take the win here, so point both
      // ends at the member.
      pairs.push([h ?? a!, a ?? h!]);
    }
    if (maxAssign(pairs, cap) === cap.reduce((x, y) => x + y, 0)) return [...group];
  }
  return null;
}

// A set of `count` other teams that can all be held to `ceiling` wins or
// fewer. An empty array means nobody needs holding; null means it cannot be
// done.
function holdGroup(field: Field, ceiling: number, count: number): string[] | null {
  const { others, base, free } = field;
  if (count <= 0) return [];
  const holdable = others.filter((id) => base[id] <= ceiling);
  if (holdable.length < count) return null;
  for (const group of subsets(holdable, count)) {
    const index = new Map(group.map((id, i) => [id, i]));
    const cap = group.map((id) => ceiling - base[id]);
    const pairs: [number, number][] = [];
    for (const g of free) {
      const h = index.get(g.homeId);
      const a = index.get(g.awayId);
      // Only games between two held teams force a win onto one of them.
      if (h !== undefined && a !== undefined) pairs.push([h, a]);
    }
    if (maxAssign(pairs, cap) === pairs.length) return [...group];
  }
  return null;
}

// The teams that can still crowd this team out: playoffTeams of them can all
// finish at or above its win total. Null when no such crowd exists, which is
// a clinch.
export function threatGroup(state: OpenState, teamId: string, ownWins: Set<Game>): string[] | null {
  const field = fieldFor(state, teamId, ownWins);
  return reachGroup(field, field.target, state.playoffTeams);
}

// The teams that can still be kept at or below this team's win total, enough
// of them to leave it a spot. Null when that cannot be done, which is
// elimination.
export function escapeGroup(state: OpenState, teamId: string, ownWins: Set<Game>): string[] | null {
  const field = fieldFor(state, teamId, ownWins);
  return holdGroup(field, field.target, field.others.length - (state.playoffTeams - 1));
}

export function lockedIn(state: OpenState, teamId: string, ownWins: Set<Game>): boolean {
  return threatGroup(state, teamId, ownWins) === null;
}

export function lockedOut(state: OpenState, teamId: string, ownWins: Set<Game>): boolean {
  return escapeGroup(state, teamId, ownWins) === null;
}

const ownGames = (state: OpenState, teamId: string) =>
  state.open.filter((g) => g.homeId === teamId || g.awayId === teamId);

// The teams to keep strictly below this one for it to be locked in after
// winning out. Null when no set of results at all would lock it in.
export function clinchWitness(state: OpenState, teamId: string): string[] | null {
  const field = fieldFor(state, teamId, new Set(ownGames(state, teamId)));
  return holdGroup(field, field.target - 1, field.others.length - (state.playoffTeams - 1));
}

// The teams to push strictly above this one for it to be locked out after
// losing out. Null when no set of results at all would lock it out.
export function eliminationWitness(state: OpenState, teamId: string): string[] | null {
  const field = fieldFor(state, teamId, new Set());
  return reachGroup(field, field.target + 1, state.playoffTeams);
}

export type Lock = "in" | "out" | null;

export interface ExactRow {
  // Wins added from here, counting only this team's undecided games.
  added: number;
  lock: Lock;
}

export interface ExactPicture {
  rows: ExactRow[];
  // Fewest more wins that lock a spot whichever games they come in; null
  // when even winning out leaves it to other results.
  clinchWins: number | null;
  // Fewest more losses that end it whichever games they come in; null when
  // even losing out leaves a way in.
  elimLosses: number | null;
}

// One row per possible number of wins from the team's undecided games. A row
// is only locked if it holds for every choice of which games those wins are.
export function exactPicture(state: OpenState, teamId: string): ExactPicture {
  const own = state.open.filter((g) => g.homeId === teamId || g.awayId === teamId);
  const rows: ExactRow[] = [];
  for (let added = 0; added <= own.length; added++) {
    let allIn = true;
    let allOut = true;
    for (const combo of subsets(own, added)) {
      const set = new Set(combo);
      if (allIn && !lockedIn(state, teamId, set)) allIn = false;
      if (allOut && !lockedOut(state, teamId, set)) allOut = false;
      if (!allIn && !allOut) break;
    }
    rows.push({ added, lock: allIn ? "in" : allOut ? "out" : null });
  }
  let clinchWins: number | null = null;
  for (let w = own.length; w >= 0 && rows[w].lock === "in"; w--) clinchWins = w;
  let elimLosses: number | null = null;
  for (let w = 0; w <= own.length && rows[w].lock === "out"; w++) elimLosses = own.length - w;
  return { rows, clinchWins, elimLosses };
}
