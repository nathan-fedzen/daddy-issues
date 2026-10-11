import type { PlayerLine, Position, Slot, SlotCounts, TeamWeek } from "@/lib/model";

const FLEX_ELIGIBLE: Position[] = ["RB", "WR", "TE"];

export interface Swap {
  benched: PlayerLine;
  started: PlayerLine;
  gain: number;
}

export interface LineupFacts {
  teamId: string;
  actual: number;
  optimal: number;
  pointsLeft: number;
  worstSwap: Swap | null;
  zeroStarters: PlayerLine[];
  emptySlots: number;
  benchTotal: number;
}

export function slotEligible(slot: Slot, position: Position): boolean {
  if (slot === "FLEX") return FLEX_ELIGIBLE.includes(position);
  return slot === position;
}

// Fixed per-position slots plus one FLEX makes greedy optimal: fill each
// position with its top scorers, then give FLEX the best leftover RB/WR/TE.
export function optimalPoints(players: PlayerLine[], slots: SlotCounts): number {
  const pool = players.filter((p) => p.slot !== "IR").sort((a, b) => b.points - a.points);
  const used = new Set<string>();
  let total = 0;
  for (const [slot, count] of Object.entries(slots) as [Slot, number][]) {
    if (slot === "FLEX") continue;
    let taken = 0;
    for (const p of pool) {
      if (taken >= count) break;
      if (used.has(p.playerId) || p.position !== slot) continue;
      used.add(p.playerId);
      total += p.points;
      taken++;
    }
  }
  let flexTaken = 0;
  for (const p of pool) {
    if (flexTaken >= (slots.FLEX ?? 0)) break;
    if (used.has(p.playerId) || !FLEX_ELIGIBLE.includes(p.position)) continue;
    used.add(p.playerId);
    total += p.points;
    flexTaken++;
  }
  return round(total);
}

export function worstSwap(players: PlayerLine[]): Swap | null {
  const starters = players.filter((p) => p.slot !== "BE" && p.slot !== "IR");
  const bench = players.filter((p) => p.slot === "BE");
  let best: Swap | null = null;
  for (const s of starters) {
    for (const b of bench) {
      if (!slotEligible(s.slot, b.position)) continue;
      const gain = round(b.points - s.points);
      if (gain > 0 && (!best || gain > best.gain)) best = { benched: b, started: s, gain };
    }
  }
  return best;
}

export function lineupFacts(team: TeamWeek, slots: SlotCounts): LineupFacts {
  const starters = team.lineup.filter((p) => p.slot !== "BE" && p.slot !== "IR");
  const bench = team.lineup.filter((p) => p.slot === "BE");
  const starterSlots = Object.values(slots).reduce((a, b) => a + (b ?? 0), 0);
  const optimal = optimalPoints(team.lineup, slots);
  return {
    teamId: team.teamId,
    actual: team.points,
    optimal,
    pointsLeft: round(Math.max(0, optimal - team.points)),
    worstSwap: worstSwap(team.lineup),
    zeroStarters: starters.filter((p) => p.points <= 0),
    emptySlots: Math.max(0, starterSlots - starters.length),
    benchTotal: round(bench.reduce((s, p) => s + p.points, 0)),
  };
}

export function round(n: number): number {
  return Math.round(n * 100) / 100;
}
