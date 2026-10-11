import type { Matchup, PlayerLine, TeamWeek } from "@/lib/model";
import { round } from "./lineup";

export interface SideResult {
  teamId: string;
  points: number;
  topPlayer: PlayerLine | null;
}

export interface MatchupResult {
  week: number;
  winner: SideResult;
  loser: SideResult;
  margin: number;
  tie: boolean;
}

function topStarter(team: TeamWeek): PlayerLine | null {
  const starters = team.lineup.filter((p) => p.slot !== "BE" && p.slot !== "IR");
  if (starters.length === 0) return null;
  return starters.reduce((a, b) => (b.points > a.points ? b : a));
}

export function matchupResults(matchups: Matchup[]): MatchupResult[] {
  return matchups.map((m) => {
    const home: SideResult = { teamId: m.home.teamId, points: m.home.points, topPlayer: topStarter(m.home) };
    const away: SideResult = { teamId: m.away.teamId, points: m.away.points, topPlayer: topStarter(m.away) };
    const homeWins = m.home.points >= m.away.points;
    return {
      week: m.week,
      winner: homeWins ? home : away,
      loser: homeWins ? away : home,
      margin: round(Math.abs(m.home.points - m.away.points)),
      tie: m.home.points === m.away.points,
    };
  });
}

export interface WeekSuperlatives {
  closest: MatchupResult | null;
  blowout: MatchupResult | null;
  highScore: SideResult | null;
  lowScore: SideResult | null;
  topPlayer: { teamId: string; player: PlayerLine } | null;
}

export function superlatives(results: MatchupResult[]): WeekSuperlatives {
  if (results.length === 0) {
    return { closest: null, blowout: null, highScore: null, lowScore: null, topPlayer: null };
  }
  const sides = results.flatMap((r) => [r.winner, r.loser]);
  const byMargin = [...results].sort((a, b) => a.margin - b.margin);
  const byPoints = [...sides].sort((a, b) => b.points - a.points);
  const withTop = sides.filter((s) => s.topPlayer);
  const top = withTop.length
    ? withTop.reduce((a, b) => (b.topPlayer!.points > a.topPlayer!.points ? b : a))
    : null;
  return {
    closest: byMargin[0],
    blowout: byMargin[byMargin.length - 1],
    highScore: byPoints[0],
    lowScore: byPoints[byPoints.length - 1],
    topPlayer: top ? { teamId: top.teamId, player: top.topPlayer! } : null,
  };
}
