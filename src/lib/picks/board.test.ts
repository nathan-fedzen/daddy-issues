import { describe, expect, it } from "vitest";
import type { Game } from "@/lib/model";
import { gameKey, gradeSheet, pickFacts, seasonBoard, votesByGame, weekRecords } from "./board";
import type { PickSheet } from "./store";

const game = (week: number, homeId: string, awayId: string, homePoints = 0, awayPoints = 0, final = false): Game => ({
  week,
  homeId,
  awayId,
  homePoints,
  awayPoints,
  final,
});

const games: Game[] = [
  game(9, "1", "2", 110, 100, true),
  game(9, "3", "4", 90, 95, true),
  game(9, "5", "6", 80, 80, true),
  game(9, "7", "8", 50, 20, false),
  game(10, "1", "3", 120, 100, true),
  game(10, "2", "4", 100, 101, true),
];

const sheet = (week: number, teamId: string, owner: string, picks: Record<string, string>): PickSheet => ({
  season: 2026,
  week,
  teamId,
  owner,
  picks,
  submittedAt: "2026-11-04T00:00:00Z",
});

const alice = sheet(9, "1", "Alice", { "1-2": "1", "3-4": "4", "5-6": "5", "7-8": "7" });
const bob = sheet(9, "2", "Bob", { "1-2": "1", "3-4": "3", "5-6": "6", "7-8": "8" });
const cara = sheet(9, "3", "Cara", { "1-2": "2", "3-4": "4", "5-6": "5", "7-8": "7" });
const aliceW10 = sheet(10, "1", "Alice", { "1-3": "1", "2-4": "4" });
const bobW10 = sheet(10, "2", "Bob", { "1-3": "3", "2-4": "2" });

const owners: Record<string, string> = { "1": "Alice", "2": "Bob", "3": "Cara", "4": "Dan", "5": "Eve", "6": "Finn", "7": "Gus", "8": "Hal" };
const ownerOf = (id: string) => owners[id];
const all = Object.keys(owners);

describe("gradeSheet", () => {
  it("marks correct, wrong, push and pending picks", () => {
    expect(gradeSheet(alice, games).map((g) => g.result)).toEqual(["correct", "correct", "push", "pending"]);
    expect(gradeSheet(bob, games).map((g) => g.result)).toEqual(["correct", "wrong", "push", "pending"]);
  });

  it("treats a pick for a game it cannot find as pending", () => {
    expect(gradeSheet(sheet(9, "1", "Alice", { "9-9": "9" }), games)[0].result).toBe("pending");
    expect(gameKey(games[0])).toBe("1-2");
  });
});

describe("weekRecords", () => {
  it("ranks by correct, then fewest wrong, then name", () => {
    expect(weekRecords([bob, alice, cara], games).map((r) => `${r.owner} ${r.correct}-${r.wrong}`)).toEqual([
      "Alice 2-0",
      "Bob 1-1",
      "Cara 1-1",
    ]);
  });
});

describe("seasonBoard", () => {
  it("sums weeks, keeps a per-week record, and runs the streak across weeks", () => {
    const rows = seasonBoard([alice, bob, aliceW10, bobW10], games);
    const a = rows.find((r) => r.owner === "Alice")!;
    expect(a).toMatchObject({ correct: 4, wrong: 0, pct: 100, streak: 4 });
    expect(a.weeks).toEqual({ 9: { correct: 2, wrong: 0 }, 10: { correct: 2, wrong: 0 } });
    const b = rows.find((r) => r.owner === "Bob")!;
    expect(b).toMatchObject({ correct: 1, wrong: 3, pct: 25, streak: -3 });
    expect(rows[0].owner).toBe("Alice");
  });
});

describe("votesByGame", () => {
  it("lists owners under the side they picked", () => {
    const v = votesByGame([alice, bob, cara], games.filter((g) => g.week === 9));
    expect(v[0]).toMatchObject({ key: "1-2", home: ["Alice", "Bob"], away: ["Cara"] });
    expect(v[1]).toMatchObject({ home: ["Bob"], away: ["Alice", "Cara"] });
  });
});

describe("pickFacts", () => {
  it("returns null when nobody picked that week", () => {
    expect(pickFacts([alice], games, 10, ownerOf, all)).toBeNull();
  });

  it("finds the non-voters and the people who picked against themselves", () => {
    const facts = pickFacts([alice, bob, cara, aliceW10, bobW10], games, 9, ownerOf, all)!;
    expect(facts.voters).toBe(3);
    expect(facts.nonVoters).toEqual(["Dan", "Eve", "Finn", "Gus", "Hal"]);
    expect(facts.againstSelf).toEqual([
      { owner: "Bob", won: false },
      { owner: "Cara", won: false },
    ]);
    expect(facts.records[0]).toEqual({ owner: "Alice", correct: 2, wrong: 0 });
    expect(facts.upsets).toEqual([]);
    expect(facts.perfect).toEqual([]);
    expect(facts.season.find((s) => s.owner === "Bob")).toMatchObject({ correct: 1, wrong: 3 });
  });

  it("calls a week perfect or winless only once every pick is decided", () => {
    const finished = games.map((g) => (g.week === 9 && !g.final ? { ...g, final: true } : g));
    const facts = pickFacts([alice, bob, cara], finished, 9, ownerOf, all)!;
    expect(facts.perfect).toEqual(["Alice"]);
    expect(facts.winless).toEqual([]);
  });

  it("reports a game as an upset when most voters had the loser", () => {
    const eve = sheet(9, "5", "Eve", { "1-2": "2", "3-4": "3", "5-6": "5", "7-8": "7" });
    const finn = sheet(9, "6", "Finn", { "1-2": "2", "3-4": "3", "5-6": "5", "7-8": "7" });
    const facts = pickFacts([alice, bob, eve, finn], games, 9, ownerOf, all)!;
    expect(facts.upsets).toEqual([{ winner: "Dan", loser: "Cara", pickedWinner: 1, pickedLoser: 3 }]);
  });
});
