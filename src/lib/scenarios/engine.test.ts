import { describe, expect, it } from "vitest";
import type { Game, Team } from "@/lib/model";
import { simulatePlayoffs } from "@/lib/facts/playoffs";
import { openState, runSims, scenarioKey, teamScenario } from "./engine";

const team = (id: string, wins: number, losses: number, pointsFor: number): Team => ({
  id,
  name: `Team ${id}`,
  abbrev: id,
  wins,
  losses,
  ties: 0,
  pointsFor,
  pointsAgainst: 0,
});

const played = (week: number, homeId: string, awayId: string, homePoints: number, awayPoints: number): Game => ({
  week,
  homeId,
  awayId,
  homePoints,
  awayPoints,
  final: true,
});

const todo = (week: number, homeId: string, awayId: string): Game => ({
  week,
  homeId,
  awayId,
  homePoints: 0,
  awayPoints: 0,
  final: false,
});

// Four teams, top two in, two weeks played and two to go.
const teams = [team("A", 2, 0, 230), team("B", 1, 1, 205), team("C", 1, 1, 200), team("D", 0, 2, 170)];
const games: Game[] = [
  played(1, "A", "B", 120, 100),
  played(1, "C", "D", 105, 80),
  played(2, "A", "C", 110, 95),
  played(2, "B", "D", 105, 90),
  todo(3, "A", "D"),
  todo(3, "B", "C"),
  todo(4, "A", "B"),
  todo(4, "C", "D"),
];

describe("runSims", () => {
  it("is deterministic for a seed and fills exactly the playoff spots", () => {
    const a = runSims(teams, games, 2, {}, 500, 3);
    const b = runSims(teams, games, 2, {}, 500, 3);
    expect(a.made).toEqual(b.made);
    expect(a.made.reduce((x, y) => x + y, 0)).toBe(500 * 2);
    expect(a.games.map((g) => g.week)).toEqual([3, 3, 4, 4]);
  });

  it("lands near the odds the issues publish", () => {
    const run = runSims(teams, games, 2, {}, 4000, 1);
    const issue = simulatePlayoffs(teams, games, 2, 4000, 2);
    for (const t of teams) {
      const mine = teamScenario(run, t.id).odds;
      const theirs = issue.odds.find((o) => o.teamId === t.id)!.odds;
      expect(Math.abs(mine - theirs), t.id).toBeLessThan(5);
    }
  });

  it("honours a what-if result in every simulation", () => {
    const key = scenarioKey(games[5]);
    const run = runSims(teams, games, 2, { [key]: "C" }, 800, 1);
    const gi = run.games.findIndex((g) => scenarioKey(g) === key);
    for (let s = 0; s < run.sims; s++) expect(run.homeWon[s * run.games.length + gi]).toBe(0);
    const state = openState(run);
    expect(state.wins.C).toBe(2);
    expect(state.open).toHaveLength(3);
  });
});

describe("teamScenario", () => {
  const run = runSims(teams, games, 2, {}, 4000, 1);

  it("lists every finishing record, best first, summing to all simulations", () => {
    const a = teamScenario(run, "A");
    expect(a.records.map((r) => `${r.added}-${r.left}`)).toEqual(["2-0", "1-1", "0-2"]);
    expect(a.records.reduce((x, r) => x + r.share, 0)).toBeCloseTo(100, 0);
  });

  it("carries the exact locks onto the records", () => {
    // A on 3 wins: only one of B and C can also reach 3 (they play each
    // other, and the loser tops out at 2), but a tie on 3 is still a tie.
    // On 4 wins nobody can catch A.
    const a = teamScenario(run, "A");
    expect(a.records[0]).toMatchObject({ lock: "in", odds: 100 });
    expect(a.status).toBe("alive");
    expect(a.clinchWins).not.toBeNull();
    // D wins out and reaches 2; A is already there and B or C gets to 2 too,
    // but only ties, so it is never locked out by arithmetic alone.
    const d = teamScenario(run, "D");
    expect(d.records[0].lock).toBeNull();
    expect(d.odds).toBeGreaterThan(0);
    expect(d.odds).toBeLessThan(100);
  });

  it("says winning your own game helps", () => {
    const b = teamScenario(run, "B");
    const own = b.swings.filter((s) => s.own);
    expect(own).toHaveLength(2);
    for (const s of own) expect(s.better).toBe("B");
    expect(b.swings[0].swing).toBeGreaterThanOrEqual(b.swings[b.swings.length - 1].swing);
  });

  it("drops what-if games from the swings and shifts the records", () => {
    const key = scenarioKey(games[5]);
    const picked = runSims(teams, games, 2, { [key]: "B" }, 2000, 1);
    const b = teamScenario(picked, "B");
    expect(b.swings.some((s) => s.key === key)).toBe(false);
    expect(b.undecided).toBe(1);
    expect(b.records.map((r) => `${r.added}-${r.left}`)).toEqual(["2-0", "1-1"]);
    expect(b.odds).toBeGreaterThan(teamScenario(run, "B").odds);
  });

  it("marks a finished race", () => {
    const done = [team("A", 9, 0, 900), team("B", 8, 1, 800), team("C", 1, 8, 500), team("D", 0, 9, 400)];
    const r = runSims(done, games, 2, {}, 500, 1);
    expect(teamScenario(r, "A")).toMatchObject({ status: "clinched", odds: 100, clinchWins: 0 });
    expect(teamScenario(r, "D")).toMatchObject({ status: "eliminated", odds: 0, elimLosses: 0 });
  });
});
