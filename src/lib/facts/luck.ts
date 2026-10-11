import type { Game, Team } from "@/lib/model";
import type { MatchupResult } from "./matchups";

export interface WeekLuck {
  teamId: string;
  points: number;
  won: boolean;
  wouldBeat: number;
  outOf: number;
}

export function weekLuck(results: MatchupResult[]): WeekLuck[] {
  const sides = results.flatMap((r) => [
    { teamId: r.winner.teamId, points: r.winner.points, won: !r.tie },
    { teamId: r.loser.teamId, points: r.loser.points, won: false },
  ]);
  return sides
    .map((s) => ({
      ...s,
      wouldBeat: sides.filter((o) => o.teamId !== s.teamId && o.points < s.points).length,
      outOf: sides.length - 1,
    }))
    .sort((a, b) => b.points - a.points);
}

export function unluckiestLoss(luck: WeekLuck[]): WeekLuck | null {
  const losers = luck.filter((l) => !l.won);
  return losers.length ? losers.reduce((a, b) => (b.points > a.points ? b : a)) : null;
}

export function luckiestWin(luck: WeekLuck[]): WeekLuck | null {
  const winners = luck.filter((l) => l.won);
  return winners.length ? winners.reduce((a, b) => (b.points < a.points ? b : a)) : null;
}

export interface SeasonLuck {
  teamId: string;
  record: string;
  standingsRank: number;
  pointsForRank: number;
  gap: number;
}

export function sortStandings(teams: Team[]): Team[] {
  return [...teams].sort(
    (a, b) => b.wins - a.wins || a.losses - b.losses || b.pointsFor - a.pointsFor,
  );
}

export function seasonLuck(teams: Team[]): SeasonLuck[] {
  const byRecord = sortStandings(teams);
  const byPoints = [...teams].sort((a, b) => b.pointsFor - a.pointsFor);
  return teams.map((t) => {
    const standingsRank = byRecord.findIndex((x) => x.id === t.id) + 1;
    const pointsForRank = byPoints.findIndex((x) => x.id === t.id) + 1;
    return {
      teamId: t.id,
      record: `${t.wins}-${t.losses}${t.ties ? `-${t.ties}` : ""}`,
      standingsRank,
      pointsForRank,
      gap: pointsForRank - standingsRank,
    };
  });
}

export function streaks(games: Game[], teamIds: string[]): Record<string, string> {
  const out: Record<string, string> = {};
  for (const id of teamIds) {
    const mine = games
      .filter((g) => g.final && (g.homeId === id || g.awayId === id))
      .sort((a, b) => a.week - b.week)
      .map((g) => {
        const me = g.homeId === id ? g.homePoints : g.awayPoints;
        const them = g.homeId === id ? g.awayPoints : g.homePoints;
        return me > them ? "W" : me < them ? "L" : "T";
      });
    if (mine.length === 0) {
      out[id] = "";
      continue;
    }
    const last = mine[mine.length - 1];
    let n = 0;
    for (let i = mine.length - 1; i >= 0 && mine[i] === last; i--) n++;
    out[id] = `${last}${n}`;
  }
  return out;
}
