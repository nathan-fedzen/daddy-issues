import type { PlayerLine, SlotCounts, TeamWeek } from "@/lib/model";
import { pickLineup, pointsOf, type Pick } from "./lineup";

export interface BenchStar extends Pick {
  teamId: string;
}

export interface BenchAllStars {
  starters: BenchStar[];
  total: number;
}

// The best lineup the league collectively left on its benches this week.
export function benchAllStars(teams: TeamWeek[], slots: SlotCounts): BenchAllStars {
  const owner = new Map<string, string>();
  const pool: PlayerLine[] = [];
  for (const t of teams) {
    for (const p of t.lineup) {
      if (p.slot !== "BE") continue;
      // Two rosters can never share a player, but a fixture might; key by both.
      const key = `${t.teamId}:${p.playerId}`;
      owner.set(key, t.teamId);
      pool.push({ ...p, playerId: key });
    }
  }
  const picks = pickLineup(pool, slots, (p) => p.points);
  const starters = picks.map((pick) => ({
    slot: pick.slot,
    player: { ...pick.player, playerId: pick.player.playerId.split(":")[1] },
    teamId: owner.get(pick.player.playerId)!,
  }));
  return { starters, total: pointsOf(picks) };
}
