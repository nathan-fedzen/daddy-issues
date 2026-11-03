import type { Matchup, PlayerLine } from "@/lib/model";

export interface Star {
  name: string;
  position: string;
  projected: number;
}

export interface TeamProjection {
  // Sum of ESPN's projections for the players currently in starting slots.
  total: number;
  stars: Star[];
}

const STARS = 3;
const round1 = (n: number) => Math.round(n * 10) / 10;

function isStarter(p: PlayerLine): boolean {
  return p.slot !== "BE" && p.slot !== "IR";
}

export function teamProjections(matchups: Matchup[]): Record<string, TeamProjection> {
  const out: Record<string, TeamProjection> = {};
  for (const side of matchups.flatMap((m) => [m.home, m.away])) {
    const starters = side.lineup.filter(isStarter);
    out[side.teamId] = {
      total: round1(starters.reduce((s, p) => s + p.projected, 0)),
      stars: [...starters]
        .sort((a, b) => b.projected - a.projected)
        .slice(0, STARS)
        .map((p) => ({ name: p.name, position: p.position, projected: round1(p.projected) })),
    };
  }
  return out;
}
