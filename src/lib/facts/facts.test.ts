import { describe, expect, it } from "vitest";
import type { Game, PlayerLine, Team, Transaction } from "@/lib/model";
import { lineupFacts, optimalPoints, pointsOf, projectedLineup, worstSwap } from "./lineup";
import { benchAllStars } from "./bench";
import { matchupResults, superlatives } from "./matchups";
import { luckiestWin, seasonLuck, streaks, unluckiestLoss, weekLuck } from "./luck";
import { transactionFacts } from "./transactions";
import { simulatePlayoffs } from "./playoffs";
import { rewindSnapshot } from "./rewind";

const SLOTS = { QB: 1, RB: 2, WR: 2, TE: 1, FLEX: 1, K: 1, "D/ST": 1 } as const;

function p(
  name: string,
  position: PlayerLine["position"],
  slot: PlayerLine["slot"],
  points: number,
): PlayerLine {
  return { playerId: name, name, position, proTeam: "X", slot, points, projected: 0, injury: "ACTIVE" };
}

const fullLineup = [
  p("qb", "QB", "QB", 20),
  p("rb1", "RB", "RB", 15),
  p("rb2", "RB", "RB", 3),
  p("wr1", "WR", "WR", 12),
  p("wr2", "WR", "WR", 0),
  p("te", "TE", "TE", 4),
  p("flex", "WR", "FLEX", 6),
  p("k", "K", "K", 8),
  p("dst", "D/ST", "D/ST", 5),
  p("benchRb", "RB", "BE", 25),
  p("benchWr", "WR", "BE", 10),
  p("benchQb", "QB", "BE", 30),
  p("irGuy", "RB", "IR", 40),
];

describe("optimalPoints", () => {
  it("fills positions with top scorers and FLEX with best leftover RB/WR/TE", () => {
    // QB 30, RB 25+15, WR 12+10, TE 4, FLEX 6 (next best WR), K 8, DST 5
    expect(optimalPoints(fullLineup, SLOTS)).toBe(115);
  });

  it("ignores IR players", () => {
    const without = fullLineup.filter((x) => x.slot !== "IR");
    expect(optimalPoints(fullLineup, SLOTS)).toBe(optimalPoints(without, SLOTS));
  });
});

describe("worstSwap", () => {
  it("finds the single most damaging start/sit", () => {
    const swap = worstSwap(fullLineup);
    expect(swap?.benched.name).toBe("benchRb");
    expect(swap?.started.name).toBe("rb2");
    expect(swap?.gain).toBe(22);
  });

  it("respects slot eligibility", () => {
    const lineup = [p("qb", "QB", "QB", 5), p("rb", "RB", "BE", 50)];
    expect(worstSwap(lineup)).toBeNull();
  });
});

describe("lineupFacts", () => {
  it("reports points left, zero starters, and empty slots", () => {
    const facts = lineupFacts({ teamId: "1", points: 73, lineup: fullLineup }, SLOTS);
    expect(facts.optimal).toBe(115);
    expect(facts.pointsLeft).toBe(42);
    expect(facts.zeroStarters.map((z) => z.name)).toEqual(["wr2"]);
    expect(facts.emptySlots).toBe(0);
    expect(facts.benchTotal).toBe(65);
  });

  it("only counts starters at exactly zero, not negatives", () => {
    const lineup = [p("qb", "QB", "QB", 20), p("wr", "WR", "WR", 0), p("dst", "D/ST", "D/ST", -2)];
    const facts = lineupFacts({ teamId: "1", points: 18, lineup }, SLOTS);
    expect(facts.zeroStarters.map((z) => z.name)).toEqual(["wr"]);
  });

  it("counts empty starting slots", () => {
    const facts = lineupFacts({ teamId: "1", points: 20, lineup: [p("qb", "QB", "QB", 20)] }, SLOTS);
    expect(facts.emptySlots).toBe(8);
  });
});

describe("projectedLineup", () => {
  const proj = (name: string, position: PlayerLine["position"], slot: PlayerLine["slot"], projected: number, points: number) => ({
    ...p(name, position, slot, points),
    projected,
  });
  const lineup = [
    proj("qbStart", "QB", "QB", 18, 5),
    proj("qbBench", "QB", "BE", 20, 30),
    proj("rb1", "RB", "RB", 15, 15),
    proj("rb2", "RB", "RB", 12, 3),
    proj("rbBench", "RB", "BE", 9, 25),
    proj("wr1", "WR", "WR", 14, 12),
    proj("wr2", "WR", "WR", 11, 0),
    proj("wrBench", "WR", "BE", 13, 10),
    proj("te", "TE", "TE", 8, 4),
    proj("k", "K", "K", 8, 8),
    proj("dst", "D/ST", "D/ST", 7, 5),
    proj("irGuy", "RB", "IR", 40, 40),
  ];

  it("starts by projection and scores what those players actually did", () => {
    const picks = projectedLineup(lineup, SLOTS);
    const names = Object.fromEntries(picks.map((x) => [x.slot === "FLEX" ? "FLEX" : x.player.name, x.player.name]));
    expect(names.qbBench).toBe("qbBench");
    expect(picks.find((x) => x.slot === "FLEX")?.player.name).toBe("wr2");
    expect(picks.map((x) => x.player.name)).not.toContain("irGuy");
    // QB 30, RB 15+3, WR 12+10, TE 4, FLEX wr2 0, K 8, DST 5
    expect(pointsOf(picks)).toBe(87);
  });
});

describe("benchAllStars", () => {
  it("builds the best lineup from every team's bench", () => {
    const teams = [
      { teamId: "1", points: 0, lineup: [p("a-qb", "QB", "BE", 20), p("a-rb", "RB", "BE", 10), p("a-wr", "WR", "WR", 50)] },
      { teamId: "2", points: 0, lineup: [p("b-qb", "QB", "BE", 25), p("b-rb", "RB", "BE", 12), p("b-te", "TE", "BE", 9)] },
    ];
    const stars = benchAllStars(teams, { QB: 1, RB: 2, TE: 1, FLEX: 1 });
    expect(stars.starters.map((s) => [s.slot, s.player.name, s.teamId])).toEqual([
      ["QB", "b-qb", "2"],
      ["RB", "b-rb", "2"],
      ["RB", "a-rb", "1"],
      ["TE", "b-te", "2"],
    ]);
    expect(stars.total).toBe(56);
  });
});

const week = [
  { week: 4, home: { teamId: "A", points: 100, lineup: [p("a", "QB", "QB", 30)] }, away: { teamId: "B", points: 99, lineup: [p("b", "QB", "QB", 10)] } },
  { week: 4, home: { teamId: "C", points: 80, lineup: [p("c", "QB", "QB", 5)] }, away: { teamId: "D", points: 140, lineup: [p("d", "WR", "WR", 45)] } },
  { week: 4, home: { teamId: "E", points: 120, lineup: [] }, away: { teamId: "F", points: 90, lineup: [] } },
];

describe("matchups", () => {
  it("picks winners, margins, and superlatives", () => {
    const results = matchupResults(week);
    expect(results[0].winner.teamId).toBe("A");
    expect(results[0].margin).toBe(1);
    const s = superlatives(results);
    expect(s.closest?.winner.teamId).toBe("A");
    expect(s.blowout?.winner.teamId).toBe("D");
    expect(s.highScore?.teamId).toBe("D");
    expect(s.lowScore?.teamId).toBe("C");
    expect(s.topPlayer?.player.name).toBe("d");
  });
});

describe("luck", () => {
  it("ranks weekly scores against the whole league", () => {
    const luck = weekLuck(matchupResults(week));
    const b = luck.find((l) => l.teamId === "B")!;
    expect(b.won).toBe(false);
    expect(b.wouldBeat).toBe(2);
    expect(b.outOf).toBe(5);
    expect(unluckiestLoss(luck)?.teamId).toBe("B");
    expect(luckiestWin(luck)?.teamId).toBe("A");
  });

  it("compares standings rank to points-for rank", () => {
    const teams: Team[] = [
      { id: "1", name: "x", abbrev: "x", wins: 3, losses: 1, ties: 0, pointsFor: 300, pointsAgainst: 0 },
      { id: "2", name: "y", abbrev: "y", wins: 1, losses: 3, ties: 0, pointsFor: 500, pointsAgainst: 0 },
    ];
    const [one, two] = seasonLuck(teams);
    expect(one.gap).toBe(1);
    expect(two.gap).toBe(-1);
    expect(two.record).toBe("1-3");
  });

  it("computes streaks from finished games", () => {
    const games: Game[] = [
      { week: 1, homeId: "1", awayId: "2", homePoints: 10, awayPoints: 5, final: true },
      { week: 2, homeId: "2", awayId: "1", homePoints: 1, awayPoints: 9, final: true },
      { week: 3, homeId: "1", awayId: "2", homePoints: 0, awayPoints: 1, final: false },
    ];
    expect(streaks(games, ["1", "2"])).toEqual({ "1": "W2", "2": "L2" });
  });
});

describe("transactions", () => {
  const tx = (id: string, teamId: string, date: string, items: Transaction["items"], type: Transaction["type"] = "ADD"): Transaction => ({
    id, teamId, date, items, type,
  });
  const andrews = { playerId: "p1", playerName: "Mark Andrews", position: "TE" as const };
  const list: Transaction[] = [
    tx("1", "A", "2026-10-03T00:00:00Z", [{ action: "DROP", ...andrews }]),
    tx("2", "A", "2026-10-07T00:00:00Z", [{ action: "ADD", ...andrews }, { action: "DROP", playerId: "p2", playerName: "Guy", position: "RB" }]),
    tx("3", "A", "2026-10-07T01:00:00Z", [{ action: "ADD", playerId: "d1", playerName: "Jets D/ST", position: "D/ST" }]),
    tx("4", "B", "2026-10-07T02:00:00Z", [
      { action: "TRADE", playerId: "t1", playerName: "RJ Harvey", position: "RB", fromTeamId: "B", toTeamId: "C" },
      { action: "TRADE", playerId: "t2", playerName: "Wan'Dale Robinson", position: "WR", fromTeamId: "C", toTeamId: "B" },
    ], "TRADE"),
    tx("5", "C", "2026-09-01T00:00:00Z", [{ action: "ADD", playerId: "old", playerName: "Old", position: "K" }]),
  ];
  const facts = transactionFacts(list, ["A", "B", "C"], 7, new Date("2026-10-09T00:00:00Z"));

  it("counts churn in the window and names the churn king", () => {
    expect(facts.total).toBe(4);
    expect(facts.churnKing?.teamId).toBe("A");
    expect(facts.churnKing?.moves).toBe(3);
    expect(facts.churnKing?.dstSwaps).toBe(1);
    expect(facts.quietTeams).toEqual(["B", "C"]);
  });

  it("detects drop-then-readd", () => {
    expect(facts.dropReadds).toHaveLength(1);
    expect(facts.dropReadds[0].playerName).toBe("Mark Andrews");
  });

  it("summarises trades by receiving side", () => {
    expect(facts.trades[0].sides).toEqual([
      { teamId: "C", received: ["RJ Harvey"] },
      { teamId: "B", received: ["Wan'Dale Robinson"] },
    ]);
  });
});

describe("simulatePlayoffs", () => {
  const teams: Team[] = ["1", "2", "3", "4"].map((id, i) => ({
    id, name: id, abbrev: id, wins: 3 - i, losses: i, ties: 0, pointsFor: 400 - i * 40, pointsAgainst: 0,
  }));
  const games: Game[] = [
    { week: 4, homeId: "1", awayId: "2", homePoints: 120, awayPoints: 100, final: true },
    { week: 4, homeId: "3", awayId: "4", homePoints: 90, awayPoints: 70, final: true },
    { week: 5, homeId: "1", awayId: "4", homePoints: 0, awayPoints: 0, final: false },
    { week: 5, homeId: "2", awayId: "3", homePoints: 0, awayPoints: 0, final: false },
  ];

  it("is deterministic for a seed and favours the better team", () => {
    const a = simulatePlayoffs(teams, games, 2, 2000, 7);
    const b = simulatePlayoffs(teams, games, 2, 2000, 7);
    expect(a).toEqual(b);
    expect(a.odds[0].teamId).toBe("1");
    expect(a.odds[0].odds).toBeGreaterThan(90);
    expect(a.odds.reduce((s, o) => s + o.odds, 0)).toBeCloseTo(200, 0);
    expect(a.weeksRemaining).toBe(1);
  });
});

describe("rewindSnapshot", () => {
  it("recomputes records from games up to the week and unfinishes the rest", () => {
    const teams: Team[] = ["1", "2"].map((id) => ({
      id, name: id, abbrev: id, wins: 5, losses: 1, ties: 0, pointsFor: 999, pointsAgainst: 999,
    }));
    const games: Game[] = [
      { week: 1, homeId: "1", awayId: "2", homePoints: 100, awayPoints: 90, final: true },
      { week: 2, homeId: "2", awayId: "1", homePoints: 80, awayPoints: 70, final: true },
      { week: 3, homeId: "1", awayId: "2", homePoints: 120, awayPoints: 60, final: true },
    ];
    const transactions: Transaction[] = [
      { id: "a", type: "ADD", teamId: "1", date: "2026-09-15T00:00:00Z", items: [] },
      { id: "b", type: "ADD", teamId: "1", date: "2026-09-30T00:00:00Z", items: [] },
    ];
    const snapshot = {
      season: 2026, week: 3, leagueName: "L", playoffTeams: 1, regularSeasonWeeks: 3, slots: SLOTS,
      teams, matchups: [], games, transactions, fetchedAt: "",
    };
    const back = rewindSnapshot(snapshot, 2, new Date("2026-09-22T12:00:00Z"));
    expect(back.week).toBe(2);
    expect(back.teams.find((t) => t.id === "1")).toMatchObject({ wins: 1, losses: 1, pointsFor: 170, pointsAgainst: 170 });
    expect(back.games[2]).toMatchObject({ final: false, homePoints: 0, awayPoints: 0 });
    expect(back.games[1]).toEqual(games[1]);
    expect(back.transactions.map((t) => t.id)).toEqual(["a"]);
    expect(snapshot.teams[0].wins).toBe(5);
  });
});
