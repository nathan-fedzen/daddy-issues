import { describe, expect, it } from "vitest";
import type { Game } from "@/lib/model";
import { mulberry32 } from "@/lib/facts/playoffs";
import { scenarioKey, type Forced } from "./engine";
import { exactPicture, type OpenState } from "./exact";
import { applyResults, quickestRoute, type Want } from "./routes";

const game = (week: number, homeId: string, awayId: string): Game => ({
  week,
  homeId,
  awayId,
  homePoints: 0,
  awayPoints: 0,
  final: false,
});

function isSettled(state: OpenState, teamId: string, want: Want, results: Forced): boolean {
  const picture = exactPicture(applyResults(state, results), teamId);
  return want === "in" ? picture.clinchWins === 0 : picture.elimLosses === 0;
}

// Whether calling every game through a week, some way, settles it.
function anyThrough(state: OpenState, teamId: string, want: Want, week: number): boolean {
  const games = state.open.filter((g) => g.week <= week);
  for (let mask = 0; mask < 1 << games.length; mask++) {
    const results: Forced = {};
    games.forEach((g, i) => (results[scenarioKey(g)] = mask & (1 << i) ? g.homeId : g.awayId));
    if (isSettled(state, teamId, want, results)) return true;
  }
  return false;
}

function randomLeague(rand: () => number): OpenState {
  const pick = (n: number) => Math.floor(rand() * n);
  const ids = ["A", "B", "C", "D", "E", "F"];
  const wins = Object.fromEntries(ids.map((id) => [id, pick(4)]));
  const open: Game[] = [];
  // Three weeks, each a full round of three games.
  for (let week = 1; week <= 3; week++) {
    const order = [...ids].sort(() => rand() - 0.5);
    for (let i = 0; i < 6; i += 2) open.push(game(week, order[i], order[i + 1]));
  }
  return { wins, open, playoffTeams: 2 + pick(2) };
}

describe("quickestRoute", () => {
  it("matches brute force on random small leagues", () => {
    const rand = mulberry32(11);
    let found = 0;
    let none = 0;
    for (let trial = 0; trial < 120; trial++) {
      const state = randomLeague(rand);
      const teamId = "ABCDEF"[Math.floor(rand() * 6)];
      for (const want of ["in", "out"] as const) {
        const label = `${want}, trial ${trial}`;
        const lastWeek = 3;
        const answer = quickestRoute(state, teamId, want);
        expect(answer.possible, label).toBe(anyThrough(state, teamId, want, lastWeek));
        if (!answer.possible) {
          expect(answer.route).toBeNull();
          none++;
          continue;
        }
        const route = answer.route;
        expect(route, label).not.toBeNull();
        if (!route) continue;
        found++;
        expect(isSettled(state, teamId, want, route.results), label).toBe(true);
        for (const key of Object.keys(route.results)) {
          const fewer = { ...route.results };
          delete fewer[key];
          expect(isSettled(state, teamId, want, fewer), `${label}, without ${key}`).toBe(false);
        }
        for (const [key, winner] of Object.entries(route.results)) {
          const g = state.open.find((x) => scenarioKey(x) === key)!;
          expect(g.week).toBeLessThanOrEqual(route.settledWeek);
          expect([g.homeId, g.awayId]).toContain(winner);
        }
        expect(route.earliest, label).toBe(true);
        if (route.settledWeek > 1) {
          expect(anyThrough(state, teamId, want, route.settledWeek - 1), label).toBe(false);
        }
      }
    }
    expect(found).toBeGreaterThan(40);
    expect(none).toBeGreaterThan(10);
  });

  it("has the team winning its own games on the way in and losing them on the way out", () => {
    const open = [game(1, "A", "B"), game(1, "C", "D"), game(2, "A", "C"), game(2, "B", "D")];
    const state: OpenState = { wins: { A: 3, B: 3, C: 3, D: 3 }, open, playoffTeams: 2 };
    const way = quickestRoute(state, "A", "in").route!;
    for (const g of open.filter((x) => x.homeId === "A")) {
      const winner = way.results[scenarioKey(g)];
      if (winner) expect(winner).toBe("A");
    }
    const out = quickestRoute(state, "A", "out").route!;
    for (const g of open.filter((x) => x.homeId === "A")) {
      const winner = out.results[scenarioKey(g)];
      if (winner) expect(winner).not.toBe("A");
    }
  });

  it("returns an empty route for a race that is already over", () => {
    const open = [game(1, "A", "B"), game(1, "C", "D")];
    const state: OpenState = { wins: { A: 9, B: 1, C: 1, D: 1 }, open, playoffTeams: 1 };
    expect(quickestRoute(state, "A", "in").route).toMatchObject({ results: {}, settledWeek: 0 });
    expect(quickestRoute(state, "A", "out")).toEqual({ possible: false, route: null });
  });
});
