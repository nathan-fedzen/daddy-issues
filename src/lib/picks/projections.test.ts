import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import type { LeagueSnapshot } from "@/lib/model";
import { teamProjections } from "./projections";

const fixture = JSON.parse(readFileSync("data/fixtures/2026-week-04.snapshot.json", "utf8")) as LeagueSnapshot;

describe("teamProjections", () => {
  const proj = teamProjections(fixture.matchups);

  it("covers every team in the week's matchups", () => {
    expect(Object.keys(proj)).toHaveLength(14);
  });

  it("sums starters only and lists the three highest projected starters", () => {
    const side = fixture.matchups[0].home;
    const starters = side.lineup.filter((p) => p.slot !== "BE" && p.slot !== "IR");
    const expected = Math.round(starters.reduce((s, p) => s + p.projected, 0) * 10) / 10;
    const t = proj[side.teamId];
    expect(t.total).toBe(expected);
    expect(t.stars).toHaveLength(3);
    expect(t.stars[0].projected).toBeGreaterThanOrEqual(t.stars[1].projected);
    expect(t.stars[1].projected).toBeGreaterThanOrEqual(t.stars[2].projected);
    const benchNames = new Set(side.lineup.filter((p) => p.slot === "BE").map((p) => p.name));
    expect(t.stars.some((s) => benchNames.has(s.name))).toBe(false);
  });
});
