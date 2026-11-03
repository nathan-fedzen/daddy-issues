import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterAll, describe, expect, it } from "vitest";
import { FilePickStore, PickExistsError, validateSheet, type PickSheet } from "./store";

const root = mkdtempSync(path.join(tmpdir(), "picks-"));
afterAll(() => rmSync(root, { recursive: true, force: true }));

const sheet = (teamId: string, owner: string, at: string): PickSheet => ({
  season: 2026,
  week: 9,
  teamId,
  owner,
  picks: { "1-2": "1" },
  submittedAt: at,
});

describe("FilePickStore", () => {
  const store = new FilePickStore(root);

  it("starts empty", async () => {
    expect(await store.list(2026)).toEqual([]);
    expect(await store.listWeek(2026, 9)).toEqual([]);
  });

  it("keeps one ballot per voter per week and rebuilds the week file", async () => {
    await store.add(sheet("12", "Nathan", "2026-11-04T01:00:00Z"));
    await store.add(sheet("7", "DJ", "2026-11-04T00:00:00Z"));
    await expect(store.add(sheet("12", "Nathan", "2026-11-04T02:00:00Z"))).rejects.toBeInstanceOf(PickExistsError);
    const week = await store.listWeek(2026, 9);
    expect(week.map((s) => s.owner)).toEqual(["DJ", "Nathan"]);
    expect(week[1].submittedAt).toBe("2026-11-04T01:00:00Z");
    expect(await store.list(2026)).toHaveLength(2);
  });
});

describe("validateSheet", () => {
  const games = [
    { key: "1-2", homeId: "1", awayId: "2" },
    { key: "3-4", homeId: "3", awayId: "4" },
  ];

  it("accepts a full ballot from someone in the league", () => {
    expect(validateSheet({ teamId: "12", picks: { "1-2": "2", "3-4": "3" } }, games)).toEqual({
      ok: true,
      teamId: "12",
      owner: "Nathan",
      picks: { "1-2": "2", "3-4": "3" },
    });
  });

  it("rejects strangers, missing games, and picks for a team not in the game", () => {
    expect(validateSheet({ teamId: "99", picks: { "1-2": "2", "3-4": "3" } }, games).ok).toBe(false);
    expect(validateSheet({ teamId: "12", picks: { "1-2": "2" } }, games).ok).toBe(false);
    expect(validateSheet({ teamId: "12", picks: { "1-2": "2", "3-4": "1" } }, games).ok).toBe(false);
    expect(validateSheet({ teamId: "12", picks: {} }, []).ok).toBe(false);
  });
});
