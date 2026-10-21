import { describe, expect, it } from "vitest";
import type { Facts, GameFact, TeamRef } from "@/lib/facts";
import { hallOfShame, oddsHistory, robotTally, scheduleSwap } from "./season";

const ref = (id: string): TeamRef => ({ teamId: id, teamName: `Team ${id}`, owner: id });

function facts(week: number, over: Partial<Facts>): Facts {
  return {
    season: 2026,
    week,
    leagueName: "L",
    newsletter: { name: "N", tagline: "T" },
    generatedAt: "",
    teams: ["A", "B", "C", "D"].map((id, i) => ({
      ...ref(id),
      record: "",
      pointsFor: 0,
      pointsAgainst: 0,
      streak: "",
      standingsRank: i + 1,
      pointsForRank: i + 1,
    })),
    results: [],
    superlatives: { closest: null, blowout: null, highScore: null, lowScore: null, topPlayer: null },
    lineups: [],
    luck: { week: [], unluckiestLoss: null, luckiestWin: null, season: [] },
    playoffs: { sims: 1, playoffTeams: 2, weeksRemaining: 1, odds: [] },
    transactions: { dropReadds: [] } as unknown as Facts["transactions"],
    injuries: [],
    chugList: [],
    nextWeek: [],
    ...over,
  };
}

const games: GameFact[] = [
  { week: 1, homeId: "A", awayId: "B", homePoints: 100, awayPoints: 90 },
  { week: 1, homeId: "C", awayId: "D", homePoints: 80, awayPoints: 120 },
  { week: 2, homeId: "A", awayId: "C", homePoints: 95, awayPoints: 70 },
  { week: 2, homeId: "B", awayId: "D", homePoints: 110, awayPoints: 60 },
  { week: 3, homeId: "A", awayId: "D", homePoints: 85, awayPoints: 130 },
  { week: 3, homeId: "B", awayId: "C", homePoints: 50, awayPoints: 75 },
];

describe("scheduleSwap", () => {
  const rows = scheduleSwap(games, ["A", "B", "C", "D"].map(ref));
  const a = rows.find((r) => r.teamId === "A")!;

  it("reproduces the actual record with a team's own schedule", () => {
    expect(a.actual).toEqual({ wins: 2, losses: 1 });
    expect(a.withSchedule.A).toEqual(a.actual);
  });

  it("replays a team's scores against another team's opponents", () => {
    // B's opponents: wk1 A (so A plays B, 90), wk2 D 60, wk3 C 75.
    expect(a.withSchedule.B).toEqual({ wins: 3, losses: 0 });
    // D's opponents: wk1 C 80, wk2 B 110, wk3 A (so A plays D, 130).
    expect(a.withSchedule.D).toEqual({ wins: 1, losses: 2 });
    expect(a.best).toEqual({ wins: 3, losses: 0 });
    expect(a.worst).toEqual({ wins: 1, losses: 2 });
    expect(a.unluckier).toBe(1);
    expect(a.luckier).toBe(1);
  });
});

describe("hallOfShame", () => {
  const lineup = (id: string, pointsLeft: number, wouldHaveWon: boolean, gain: number) =>
    ({
      ...ref(id),
      actual: 100,
      optimal: 100 + pointsLeft,
      pointsLeft,
      worstSwap: gain ? { gain, benched: { name: `bench-${id}` }, started: { name: `start-${id}` } } : null,
      zeroStarters: [],
      emptySlots: 0,
      benchTotal: 0,
      opponentPoints: 100 + gain - 1,
      wouldHaveWon,
    }) as unknown as Facts["lineups"][number];
  const result = (w: string, l: string, wp: number, lp: number) => ({
    winner: { ...ref(w), points: wp, topPlayer: null },
    loser: { ...ref(l), points: lp, topPlayer: null },
    margin: wp - lp,
    tie: false,
  });
  const chug = (id: string, player: string) => ({ ...ref(id), player, position: "WR", slot: "WR" });

  const issues = [
    {
      week: 1,
      facts: facts(1, {
        lineups: [lineup("A", 10, false, 4), lineup("B", 30, true, 20)],
        results: [result("A", "B", 100, 60)],
        chugList: [chug("B", "x")],
      }),
    },
    {
      week: 2,
      facts: facts(2, {
        lineups: [lineup("A", 5, false, 0), lineup("B", 12, false, 11)],
        results: [result("B", "A", 90, 85)],
        chugList: [chug("B", "y")],
      }),
    },
    { week: 3, facts: facts(3, { games, results: [result("D", "A", 130, 85), result("C", "B", 75, 50)] }) },
  ];
  const shame = hallOfShame(issues);

  it("totals bench points and games it cost", () => {
    expect(shame.benchPoints[0]).toMatchObject({ teamId: "B", total: 42, gamesCost: 1, weeks: 2 });
  });

  it("ranks the lowest weeks, worst swaps, and blowouts", () => {
    expect(shame.lowestWeeks[0]).toMatchObject({ teamId: "B", week: 3, points: 50 });
    expect(shame.worstSwaps[0]).toMatchObject({
      teamId: "B",
      week: 1,
      benched: "bench-B",
      started: "start-B",
      gain: 20,
      costTheGame: true,
    });
    expect(shame.blowouts[0]).toMatchObject({ week: 3, margin: 45 });
  });

  it("counts chugs and finds losing streaks from the latest games list", () => {
    expect(shame.chugs).toEqual([{ ...ref("B"), count: 2 }]);
    expect(shame.losingStreaks[0]).toMatchObject({ teamId: "C", length: 2, from: 1, to: 2, alive: false });
  });
});

describe("oddsHistory and robotTally", () => {
  const odds = (o: number, weeksRemaining: number) => ({
    sims: 1,
    playoffTeams: 2,
    weeksRemaining,
    odds: [{ ...ref("A"), odds: o, byeOdds: 0, avgWins: 0, seed: 1 }],
  });
  const robot = (actual: number, robot: number, opp: number) => [
    { ...ref("A"), actual, robot, diff: robot - actual, opponentPoints: opp, actualWon: actual > opp, robotWon: robot > opp, starters: [] },
  ];
  const issues = [
    { week: 1, facts: facts(1, { playoffs: odds(60, 2), robot: robot(100, 110, 105) }) },
    { week: 2, facts: facts(2, { playoffs: odds(45.5, 1), robot: robot(120, 90, 100) }) },
  ];

  it("tracks odds per week with the latest change", () => {
    const [a] = oddsHistory(issues);
    expect(a.points).toEqual([
      { week: 1, odds: 60 },
      { week: 2, odds: 45.5 },
    ]);
    expect(a.current).toBe(45.5);
    expect(a.change).toBe(-14.5);
  });

  it("keeps a running robot-versus-human score", () => {
    const [a] = robotTally(issues);
    expect(a).toMatchObject({ humanWins: 1, robotWins: 1, net: -20, robotAhead: 1 });
    expect(a.weeks).toHaveLength(2);
  });
});
