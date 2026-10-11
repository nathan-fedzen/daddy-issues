import type { Game, Team } from "@/lib/model";

export interface PlayoffOdds {
  teamId: string;
  odds: number;
  avgWins: number;
  byeOdds: number;
}

export interface PlayoffSim {
  sims: number;
  playoffTeams: number;
  weeksRemaining: number;
  odds: PlayoffOdds[];
}

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function gaussian(rand: () => number): number {
  const u = Math.max(rand(), 1e-12);
  const v = rand();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

export function scoreHistory(games: Game[], teamId: string): number[] {
  return games
    .filter((g) => g.final && (g.homeId === teamId || g.awayId === teamId))
    .map((g) => (g.homeId === teamId ? g.homePoints : g.awayPoints));
}

const PRIOR_GAMES = 4;
const SD_FLOOR = 20;

// Early in the season a team's sample is tiny, so the mean is shrunk toward
// the league average as if it had PRIOR_GAMES extra average games, and the
// spread has a floor. Keeps a 4-0 start from reading as a lock.
function distribution(scores: number[], leagueMean: number): { mean: number; sd: number } {
  if (scores.length === 0) return { mean: leagueMean, sd: SD_FLOOR };
  const raw = scores.reduce((a, b) => a + b, 0) / scores.length;
  const mean = (raw * scores.length + leagueMean * PRIOR_GAMES) / (scores.length + PRIOR_GAMES);
  const variance =
    scores.reduce((a, b) => a + (b - raw) ** 2, 0) / Math.max(1, scores.length - 1);
  return { mean, sd: Math.max(Math.sqrt(variance), SD_FLOOR) };
}

export function simulatePlayoffs(
  teams: Team[],
  games: Game[],
  playoffTeams: number,
  sims = 5000,
  seed = 1,
): PlayoffSim {
  const rand = mulberry32(seed);
  const remaining = games.filter((g) => !g.final);
  const allScores = games.filter((g) => g.final).flatMap((g) => [g.homePoints, g.awayPoints]);
  const leagueMean = allScores.length
    ? allScores.reduce((a, b) => a + b, 0) / allScores.length
    : 100;
  const dist = new Map(
    teams.map((t) => [t.id, distribution(scoreHistory(games, t.id), leagueMean)]),
  );
  const made = new Map(teams.map((t) => [t.id, 0]));
  const byes = new Map(teams.map((t) => [t.id, 0]));
  const winsTotal = new Map(teams.map((t) => [t.id, 0]));
  const byeSlots = playoffTeams % 4 === 2 ? 2 : 0;

  for (let s = 0; s < sims; s++) {
    const wins = new Map(teams.map((t) => [t.id, t.wins]));
    const pf = new Map(teams.map((t) => [t.id, t.pointsFor]));
    for (const g of remaining) {
      const h = dist.get(g.homeId);
      const a = dist.get(g.awayId);
      if (!h || !a) continue;
      const hs = h.mean + h.sd * gaussian(rand);
      const as = a.mean + a.sd * gaussian(rand);
      pf.set(g.homeId, pf.get(g.homeId)! + hs);
      pf.set(g.awayId, pf.get(g.awayId)! + as);
      if (hs > as) wins.set(g.homeId, wins.get(g.homeId)! + 1);
      else wins.set(g.awayId, wins.get(g.awayId)! + 1);
    }
    const order = teams
      .map((t) => t.id)
      .sort((x, y) => wins.get(y)! - wins.get(x)! || pf.get(y)! - pf.get(x)!);
    order.slice(0, playoffTeams).forEach((id) => made.set(id, made.get(id)! + 1));
    order.slice(0, byeSlots).forEach((id) => byes.set(id, byes.get(id)! + 1));
    for (const id of order) winsTotal.set(id, winsTotal.get(id)! + wins.get(id)!);
  }

  const weeks = new Set(remaining.map((g) => g.week));
  return {
    sims,
    playoffTeams,
    weeksRemaining: weeks.size,
    odds: teams
      .map((t) => ({
        teamId: t.id,
        odds: Math.round((made.get(t.id)! / sims) * 1000) / 10,
        byeOdds: Math.round((byes.get(t.id)! / sims) * 1000) / 10,
        avgWins: Math.round((winsTotal.get(t.id)! / sims) * 10) / 10,
      }))
      .sort((a, b) => b.odds - a.odds),
  };
}
