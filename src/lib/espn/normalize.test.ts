import { describe, expect, it } from "vitest";
import type { EspnActivityTopic, EspnPlayer, EspnScheduleItem } from "./client";
import { latestCompletedWeek, normalizeActivity, normalizeSlots, playerIdsIn } from "./normalize";

const player = (id: number, fullName: string, defaultPositionId: number): [number, EspnPlayer] => [
  id,
  { id, fullName, defaultPositionId, proTeamId: 7 },
];
const players = new Map<number, EspnPlayer>([
  player(1, "Mark Andrews", 4),
  player(2, "Chris Bell", 3),
  player(3, "Will Shipley", 2),
  player(4, "Keaton Mitchell", 2),
  player(5, "Jets D/ST", 16),
]);

const topics: EspnActivityTopic[] = [
  { id: "t1", date: 1, messages: [{ messageTypeId: 179, targetId: 1, to: 1 }, { messageTypeId: 178, targetId: 2, to: 1 }] },
  { id: "t2", date: 2, messages: [{ messageTypeId: 180, targetId: 5, to: 11 }] },
  { id: "t3", date: 3, messages: [{ messageTypeId: 244, targetId: 3, from: 1, to: 4 }, { messageTypeId: 244, targetId: 4, from: 4, to: 1 }] },
  { id: "t4", date: 4, messages: [{ messageTypeId: 178, targetId: 999, to: 2 }] },
  { id: "t5", date: 5, messages: [{ messageTypeId: 500, targetId: 1, to: 2 }] },
];

describe("normalizeActivity", () => {
  const out = normalizeActivity(topics, players);

  it("maps drop+add topics to ADD transactions owned by the acting team", () => {
    const t = out.find((x) => x.id === "t1")!;
    expect(t.type).toBe("ADD");
    expect(t.teamId).toBe("1");
    expect(t.items).toEqual([
      { playerId: "1", playerName: "Mark Andrews", position: "TE", action: "DROP", fromTeamId: "1" },
      { playerId: "2", playerName: "Chris Bell", position: "WR", action: "ADD", toTeamId: "1" },
    ]);
  });

  it("marks waiver claims and keeps D/ST position", () => {
    const t = out.find((x) => x.id === "t2")!;
    expect(t.type).toBe("WAIVER");
    expect(t.items[0]).toMatchObject({ action: "ADD", position: "D/ST", toTeamId: "11" });
  });

  it("keeps every leg of a trade with both teams", () => {
    const t = out.find((x) => x.id === "t3")!;
    expect(t.type).toBe("TRADE");
    expect(t.items.map((i) => `${i.playerName}:${i.fromTeamId}>${i.toTeamId}`)).toEqual([
      "Will Shipley:1>4",
      "Keaton Mitchell:4>1",
    ]);
  });

  it("skips unknown players and unknown message types, newest first", () => {
    expect(out.map((x) => x.id)).toEqual(["t3", "t2", "t1"]);
  });

  it("collects player ids for lookup", () => {
    expect(playerIdsIn(topics)).toEqual([1, 2, 5, 3, 4, 999]);
  });
});

describe("latestCompletedWeek", () => {
  const game = (matchupPeriodId: number, winner: EspnScheduleItem["winner"]): EspnScheduleItem => ({
    id: matchupPeriodId,
    matchupPeriodId,
    winner,
    home: { teamId: 1, totalPoints: 0 },
    away: { teamId: 2, totalPoints: 0 },
  });

  it("returns the last week where every matchup is decided", () => {
    expect(latestCompletedWeek([game(1, "HOME"), game(2, "AWAY"), game(3, "UNDECIDED")])).toBe(2);
  });

  it("ignores bye entries without an away side", () => {
    const bye = { ...game(3, "UNDECIDED"), away: undefined };
    expect(latestCompletedWeek([game(1, "HOME"), game(2, "HOME"), bye])).toBe(2);
  });
});

describe("normalizeSlots", () => {
  it("drops bench, IR, and zero-count slots", () => {
    expect(normalizeSlots({ "0": 1, "2": 2, "4": 2, "6": 1, "23": 1, "17": 1, "16": 1, "20": 6, "21": 1, "7": 0 })).toEqual({
      QB: 1,
      RB: 2,
      WR: 2,
      TE: 1,
      FLEX: 1,
      K: 1,
      "D/ST": 1,
    });
  });
});
