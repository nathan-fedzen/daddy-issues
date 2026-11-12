import { unstable_cache } from "next/cache";
import { league } from "@/config/league";
import type { Game, Team } from "@/lib/model";
import { credentialsFromEnv, EspnClient } from "@/lib/espn/client";
import { normalizeGames, normalizeTeams } from "@/lib/espn/normalize";

export interface ScenarioLeague {
  teams: Team[];
  // Regular-season games only, finished and still to play.
  games: Game[];
  playoffTeams: number;
  regularSeasonWeeks: number;
  fetchedAt: string;
}

export const SCENARIO_TAG = "scenarios-live";
// Records only move when a week goes final, so this can sit a while.
const LIVE_SECONDS = 900;

// The stored issues keep finished games only, so the remaining schedule has
// to come from ESPN. One overview call, no Blob reads.
export async function loadScenarioLeague(): Promise<ScenarioLeague> {
  const client = new EspnClient(league.espnLeagueId, league.season, credentialsFromEnv());
  const overview = await client.overview();
  const regularSeasonWeeks = overview.settings.scheduleSettings.matchupPeriodCount;
  return {
    teams: normalizeTeams(overview.teams),
    games: normalizeGames(overview.schedule).filter((g) => g.week <= regularSeasonWeeks),
    playoffTeams: overview.settings.scheduleSettings.playoffTeamCount,
    regularSeasonWeeks,
    fetchedAt: new Date().toISOString(),
  };
}

export const fetchScenarioLeague: () => Promise<ScenarioLeague> = process.env.BLOB_READ_WRITE_TOKEN
  ? unstable_cache(loadScenarioLeague, ["scenario-league"], { tags: [SCENARIO_TAG], revalidate: LIVE_SECONDS })
  : loadScenarioLeague;
