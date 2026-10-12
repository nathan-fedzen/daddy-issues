import { describe, expect, it } from "vitest";
import { buildLedger, chugPathname, extensionFor, parseChugPathname, type ChugVideo } from "./chugs";

describe("chug pathnames", () => {
  it("round-trips season, week, team and timestamp", () => {
    const p = chugPathname(2026, 4, "12", "MOV", 1791822437409);
    expect(p).toBe("chugs/2026/week-04/t12-1791822437409.mov");
    expect(parseChugPathname(p)).toEqual({ season: 2026, week: 4, teamId: "12", uploadedMs: 1791822437409, ext: "mov" });
  });

  it("accepts the random suffix the store appends on upload", () => {
    expect(parseChugPathname("chugs/2026/week-04/t1-1791826157164-EjitYRLzCcd2OG5SZSPcljQxu7Egt5.mp4")).toMatchObject({
      week: 4,
      teamId: "1",
      uploadedMs: 1791826157164,
      ext: "mp4",
    });
  });

  it("rejects anything outside the pattern", () => {
    expect(parseChugPathname("chugs/2026/week-4/t12-1.mov")).toBeNull();
    expect(parseChugPathname("issues/2026/week-04.json")).toBeNull();
    expect(parseChugPathname("chugs/2026/week-04/t12-1791822437409.mov/extra")).toBeNull();
  });

  it("picks an extension from the filename, then the type, then mp4", () => {
    expect(extensionFor({ name: "IMG_1234.MOV", type: "video/quicktime" })).toBe("mov");
    expect(extensionFor({ name: "clip", type: "video/webm" })).toBe("webm");
    expect(extensionFor({ name: "clip", type: "" })).toBe("mp4");
  });
});

describe("buildLedger", () => {
  const video = (teamId: string, week: number, uploadedMs: number): ChugVideo => ({
    season: 2026, week, teamId, uploadedMs, ext: "mp4",
    pathname: chugPathname(2026, week, teamId, "mp4", uploadedMs), url: "https://x/" + uploadedMs, owner: "o", size: 1,
  });
  const owed = [
    { week: 4, teamId: "1", owner: "Rudy", player: "Rashee Rice", slot: "WR" },
    { week: 4, teamId: "1", owner: "Rudy", player: "Someone Else", slot: "TE" },
    { week: 4, teamId: "4", owner: "Culley", player: "Ladd McConkey", slot: "FLEX" },
    { week: 3, teamId: "1", owner: "Rudy", player: "Old Debt", slot: "RB" },
  ];

  it("pairs each debt with one upload for that team and week, earliest first", () => {
    const ledger = buildLedger(owed, [video("1", 4, 200), video("1", 4, 100), video("4", 5, 50)]);
    expect(ledger.map((l) => l.video?.uploadedMs ?? null)).toEqual([100, 200, null, null]);
  });

  it("never settles a debt with a video from another week", () => {
    const ledger = buildLedger(owed, [video("1", 5, 1)]);
    expect(ledger.every((l) => l.video === null)).toBe(true);
  });
});
