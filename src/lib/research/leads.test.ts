import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import type { LeagueSnapshot, PlayerLine } from "@/lib/model";
import { buildFacts } from "@/lib/facts";
import { researchLeads } from "./leads";

const fixture = JSON.parse(readFileSync("data/fixtures/2026-week-04.snapshot.json", "utf8")) as LeagueSnapshot;
const now = new Date("2026-10-07T12:00:00Z");

// The fixture predates box lines; stamp one on every player so the facts carry boxScores.
function withBox(snapshot: LeagueSnapshot, override: (p: PlayerLine) => PlayerLine["box"] | undefined): LeagueSnapshot {
  const stamp = (p: PlayerLine): PlayerLine => ({
    ...p,
    box: override(p) ?? { played: p.points !== 0, line: p.points !== 0 ? "some line" : "did not play" },
  });
  return {
    ...snapshot,
    matchups: snapshot.matchups.map((m) => ({
      ...m,
      home: { ...m.home, lineup: m.home.lineup.map(stamp) },
      away: { ...m.away, lineup: m.away.lineup.map(stamp) },
    })),
  };
}

describe("researchLeads", () => {
  const snapshot = withBox(fixture, (p) =>
    p.name === "Ladd McConkey" ? { played: true, line: "0/1 tgt, 0 yds" } : undefined,
  );
  const facts = buildFacts(snapshot, now);
  const leads = researchLeads(facts);
  const find = (name: string) => leads.find((l) => l.player === name);

  it("separates a zero who played from a zero who did not", () => {
    expect(find("Ladd McConkey")?.reasons).toContain("zero");
    expect(find("Ladd McConkey")?.reasons).not.toContain("did-not-play");
    expect(find("Ladd McConkey")?.line).toBe("0/1 tgt, 0 yds");
    expect(find("Jets D/ST")?.reasons).toContain("did-not-play");
  });

  it("flags the benched star and the week's top player", () => {
    const collins = find("Nico Collins");
    expect(collins?.owner).toBe("Daniel");
    expect(collins?.reasons).toContain("benched-star");
    expect(leads.some((l) => l.reasons.includes("top-player"))).toBe(true);
  });

  it("puts no-shows and zeros first, dedupes by owner and player, and caps the list", () => {
    expect(leads[0].reasons[0]).toMatch(/did-not-play|zero/);
    const keys = leads.map((l) => `${l.owner}:${l.player}`);
    expect(new Set(keys).size).toBe(keys.length);
    expect(leads.length).toBeLessThanOrEqual(24);
    expect(researchLeads(facts, 5)).toHaveLength(5);
  });

  it("falls back to the chug list and worst swaps when there are no box scores", () => {
    const bare = researchLeads(buildFacts(fixture, now));
    expect(bare.filter((l) => l.reasons.includes("zero")).map((l) => l.player)).toEqual([
      "Ladd McConkey",
      "Jets D/ST",
      "Rashee Rice",
    ]);
    expect(bare.find((l) => l.player === "Nico Collins")?.reasons).toContain("benched-star");
  });
});
