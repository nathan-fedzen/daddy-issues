import { unstable_cache } from "next/cache";
import { league } from "@/config/league";
import type { Game, Team } from "@/lib/model";
import { credentialsFromEnv, EspnClient } from "@/lib/espn/client";
import { normalizeGames, normalizeMatchups, normalizeTeams } from "@/lib/espn/normalize";
import { teamProjections, type TeamProjection } from "./projections";

export interface Slate {
  games: Game[];
  teams: Team[];
  // Projected total and top starters per team for the requested week.
  projections: Record<string, TeamProjection>;
  currentWeek: number;
  fetchedAt: string;
}

export const LIVE_TAG = "picks-live";
// How stale a live score may be on the picks page.
const LIVE_SECONDS = 600;

export async function loadSlate(week: number): Promise<Slate> {
  const client = new EspnClient(league.espnLeagueId, league.season, credentialsFromEnv());
  const [overview, box] = await Promise.all([client.overview(), client.boxScores(week)]);
  return {
    games: normalizeGames(overview.schedule),
    teams: normalizeTeams(overview.teams),
    projections: teamProjections(normalizeMatchups(box.schedule, week)),
    currentWeek: overview.status.latestScoringPeriod,
    fetchedAt: new Date().toISOString(),
  };
}

// Two ESPN calls every ten minutes at most per week in production; uncached
// in dev so a reload shows the latest numbers.
export const fetchSlate: (week: number) => Promise<Slate> = process.env.BLOB_READ_WRITE_TOKEN
  ? unstable_cache(loadSlate, ["picks-slate"], { tags: [LIVE_TAG], revalidate: LIVE_SECONDS })
  : loadSlate;
