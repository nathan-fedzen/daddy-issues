import type { LeagueSnapshot } from "@/lib/model";
import { league } from "@/config/league";
import { credentialsFromEnv, EspnClient } from "./client";
import { assembleSnapshot, latestCompletedWeek, normalizeActivity, playerIdsIn } from "./normalize";

export async function fetchSnapshot(week?: number): Promise<LeagueSnapshot> {
  const client = new EspnClient(league.espnLeagueId, league.season, credentialsFromEnv());
  const overview = await client.overview();
  const target = week ?? latestCompletedWeek(overview.schedule);
  if (target < 1) throw new Error("No completed week yet.");

  const [box, activity] = await Promise.all([client.boxScores(target), client.activity()]);
  const players = await client.players(playerIdsIn(activity));
  const lookup = new Map(players.map((p) => [p.id, p.player]));

  return assembleSnapshot({
    overview,
    box,
    week: target,
    transactions: normalizeActivity(activity, lookup),
    fetchedAt: new Date(),
  });
}
