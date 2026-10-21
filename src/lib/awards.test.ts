import { describe, expect, it } from "vitest";
import type { Facts, TeamRef } from "@/lib/facts";
import { trophyCase, weekAwards } from "./awards";

const ref = (id: string): TeamRef => ({ teamId: id, teamName: `Team ${id}`, owner: id });
const side = (id: string, points: number) => ({ ...ref(id), points, topPlayer: null });

function facts(week: number, over: Partial<Facts> = {}): Facts {
  const high = side("A", 150);
  const low = side("B", 60);
  return {
    season: 2026,
    week,
    leagueName: "L",
    newsletter: { name: "N", tagline: "T" },
    generatedAt: "",
    teams: [],
    results: [],
    superlatives: {
      closest: null,
      blowout: { winner: high, loser: low, margin: 90, tie: false },
      highScore: high,
      lowScore: low,
      topPlayer: null,
    },
    lineups: [
      { ...ref("C"), pointsLeft: 31.5, wouldHaveWon: true },
      { ...ref("A"), pointsLeft: 2, wouldHaveWon: false },
    ] as unknown as Facts["lineups"],
    luck: {
      week: [],
      luckiestWin: { ...ref("D"), points: 80, won: true, wouldBeat: 2, outOf: 13 },
      unluckiestLoss: { ...ref("E"), points: 140, won: false, wouldBeat: 11, outOf: 13 },
      season: [],
    },
    playoffs: { sims: 1, playoffTeams: 2, weeksRemaining: 1, odds: [] },
    transactions: { churnKing: { ...ref("F"), moves: 9 } } as unknown as Facts["transactions"],
    injuries: [],
    chugList: [
      { ...ref("B"), player: "x", position: "WR", slot: "WR" },
      { ...ref("B"), player: "y", position: "RB", slot: "RB" },
    ],
    nextWeek: [],
    ...over,
  };
}

describe("weekAwards", () => {
  const awards = weekAwards(facts(3));
  const winner = (key: string) => awards.find((a) => a.key === key)?.winners;

  it("hands every trophy to the right owner", () => {
    expect(winner("belt")).toMatchObject([{ owner: "A", detail: "150.00 points" }]);
    expect(winner("dumpster")?.[0].owner).toBe("B");
    expect(winner("couch")).toMatchObject([{ owner: "C", detail: "31.5 on the bench, and it cost the game" }]);
    expect(winner("lucky")).toMatchObject([{ owner: "D", detail: "won with the 12th best score" }]);
    expect(winner("robbed")).toMatchObject([{ owner: "E", detail: "lost with the 3rd best score" }]);
    expect(winner("hammer")).toMatchObject([{ owner: "A", detail: "beat B by 90.00" }]);
    expect(winner("churn")).toMatchObject([{ owner: "F", detail: "9 moves in a week" }]);
  });

  it("folds a double zero into one chug trophy", () => {
    expect(winner("chug")).toEqual([{ ...ref("B"), detail: "x, y" }]);
  });

  it("withholds luck trophies when the win or loss was deserved", () => {
    const fair = weekAwards(
      facts(3, {
        luck: {
          week: [],
          luckiestWin: { ...ref("D"), points: 80, won: true, wouldBeat: 9, outOf: 13 },
          unluckiestLoss: { ...ref("E"), points: 140, won: false, wouldBeat: 3, outOf: 13 },
          season: [],
        },
      }),
    );
    expect(fair.map((a) => a.key)).not.toContain("lucky");
    expect(fair.map((a) => a.key)).not.toContain("robbed");
  });
});

describe("trophyCase", () => {
  const shelves = trophyCase([
    { week: 2, facts: facts(2), hasIssue: false },
    { week: 1, facts: facts(1) },
  ]);

  it("stacks repeat wins and sorts by total hardware", () => {
    const a = shelves.find((s) => s.teamId === "A")!;
    expect(a.total).toBe(4);
    expect(a.trophies.map((t) => [t.key, t.weeks])).toEqual([
      ["belt", [1, 2]],
      ["hammer", [1, 2]],
    ]);
    expect(shelves[0].teamId).toBe("A");
  });

  it("only awards chugs for weeks that had an issue", () => {
    const b = shelves.find((s) => s.teamId === "B")!;
    expect(b.trophies.find((t) => t.key === "chug")?.weeks).toEqual([1]);
    expect(b.trophies.find((t) => t.key === "dumpster")?.weeks).toEqual([1, 2]);
  });
});
