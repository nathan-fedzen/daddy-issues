import type { LeagueSnapshot, Team } from "@/lib/model";
import { round } from "./lineup";

// ESPN serves past box scores, but the overview around them is always today's:
// current records, every finished game. Rewinding turns that into what the
// league looked like the Tuesday after `week`, so odds, luck and standings
// for a backfilled week match what an issue would have printed at the time.
export function rewindSnapshot(snapshot: LeagueSnapshot, week: number, now: Date): LeagueSnapshot {
  const games = snapshot.games.map((g) =>
    g.week <= week ? g : { ...g, final: false, homePoints: 0, awayPoints: 0 },
  );
  const played = games.filter((g) => g.final && g.week <= week);
  const teams = snapshot.teams.map((t) => rewindTeam(t, played));
  const cutoff = now.getTime();
  return {
    ...snapshot,
    week,
    games,
    teams,
    transactions: snapshot.transactions.filter((t) => new Date(t.date).getTime() <= cutoff),
    fetchedAt: now.toISOString(),
  };
}

function rewindTeam(team: Team, played: LeagueSnapshot["games"]): Team {
  let wins = 0;
  let losses = 0;
  let ties = 0;
  let pointsFor = 0;
  let pointsAgainst = 0;
  for (const g of played) {
    if (g.homeId !== team.id && g.awayId !== team.id) continue;
    const mine = g.homeId === team.id ? g.homePoints : g.awayPoints;
    const theirs = g.homeId === team.id ? g.awayPoints : g.homePoints;
    pointsFor += mine;
    pointsAgainst += theirs;
    if (mine > theirs) wins++;
    else if (mine < theirs) losses++;
    else ties++;
  }
  return { ...team, wins, losses, ties, pointsFor: round(pointsFor), pointsAgainst: round(pointsAgainst) };
}
