import { describe, expect, it } from "vitest";
import { boxLine } from "./box-line";

describe("boxLine", () => {
  it("treats a missing or empty stat line as not playing", () => {
    expect(boxLine("WR", undefined)).toEqual({ played: false, line: "did not play" });
    expect(boxLine("RB", {})).toEqual({ played: false, line: "did not play" });
  });

  it("reads a quarterback who threw once and left", () => {
    expect(boxLine("QB", { "0": 1, "2": 1, "156": 1, "210": 1 })).toEqual({
      played: true,
      line: "0/1, 0 yds, 0 TD, 0 INT",
    });
  });

  it("adds rushing and fumbles to a quarterback line", () => {
    const line = boxLine("QB", {
      "0": 30, "1": 20, "3": 250, "4": 2, "20": 1, "23": 6, "24": 41, "25": 1, "72": 1, "210": 1,
    });
    expect(line.line).toBe("20/30, 250 yds, 2 TD, 1 INT; 6 car, 41 yds, 1 TD; 1 fumble lost");
  });

  it("describes a running back's touches", () => {
    expect(boxLine("RB", { "23": 19, "24": 76, "58": 1, "210": 1 }).line).toBe("19 car, 76 yds; 0/1 tgt, 0 yds");
  });

  it("describes a receiver with one target and a receiver with none", () => {
    expect(boxLine("WR", { "58": 1, "155": 1, "210": 1 }).line).toBe("0/1 tgt, 0 yds");
    expect(boxLine("WR", { "210": 1 }).line).toBe("played, no touches");
    expect(boxLine("TE", { "53": 5, "58": 7, "42": 61, "43": 1, "210": 1 }).line).toBe("5/7 tgt, 61 yds, 1 TD");
  });

  it("describes kickers and defenses", () => {
    expect(boxLine("K", { "83": 2, "84": 3, "86": 1, "87": 1, "210": 1 }).line).toBe("2/3 FG, 1/1 XP");
    expect(boxLine("D/ST", { "95": 1, "96": 1, "99": 2, "120": 24, "127": 399, "210": 1 }).line).toBe(
      "2 sacks, 2 takeaways, 24 pts allowed, 399 yds allowed",
    );
  });
});
