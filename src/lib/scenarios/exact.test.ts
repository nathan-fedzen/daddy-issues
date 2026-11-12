import { describe, expect, it } from "vitest";
import type { Game } from "@/lib/model";
import { mulberry32 } from "@/lib/facts/playoffs";
import { exactPicture, lockedIn, lockedOut, type OpenState } from "./exact";

const game = (week: number, homeId: string, awayId: string): Game => ({
  week,
  homeId,
  awayId,
  homePoints: 0,
  awayPoints: 0,
  final: false,
});

// Every outcome of the free games, checked the slow way.
function brute(state: OpenState, teamId: string, ownWins: Set<Game>): { in: boolean; out: boolean } {
  const base = { ...state.wins };
  const free: Game[] = [];
  for (const g of state.open) {
    if (g.homeId !== teamId && g.awayId !== teamId) free.push(g);
    else if (ownWins.has(g)) base[teamId]++;
    else base[g.homeId === teamId ? g.awayId : g.homeId]++;
  }
  let alwaysIn = true;
  let alwaysOut = true;
  for (let mask = 0; mask < 1 << free.length; mask++) {
    const wins = { ...base };
    free.forEach((g, i) => wins[mask & (1 << i) ? g.homeId : g.awayId]++);
    const others = Object.keys(wins).filter((id) => id !== teamId);
    const atOrAbove = others.filter((id) => wins[id] >= wins[teamId]).length;
    const above = others.filter((id) => wins[id] > wins[teamId]).length;
    if (atOrAbove >= state.playoffTeams) alwaysIn = false;
    if (above < state.playoffTeams) alwaysOut = false;
  }
  return { in: alwaysIn, out: alwaysOut };
}

describe("lockedIn / lockedOut", () => {
  it("agrees with brute force on random small leagues", () => {
    const rand = mulberry32(7);
    const pick = (n: number) => Math.floor(rand() * n);
    let ins = 0;
    let outs = 0;
    for (let trial = 0; trial < 300; trial++) {
      const ids = ["A", "B", "C", "D", "E", "F"];
      const wins = Object.fromEntries(ids.map((id) => [id, pick(5)]));
      const open: Game[] = [];
      const count = 3 + pick(8);
      for (let i = 0; i < count; i++) {
        const h = pick(ids.length);
        let a = pick(ids.length - 1);
        if (a >= h) a++;
        open.push(game(i, ids[h], ids[a]));
      }
      const state: OpenState = { wins, open, playoffTeams: 1 + pick(4) };
      const team = ids[pick(ids.length)];
      const own = open.filter((g) => g.homeId === team || g.awayId === team);
      const ownWins = new Set(own.filter(() => rand() < 0.5));
      const want = brute(state, team, ownWins);
      expect(lockedIn(state, team, ownWins), `in, trial ${trial}`).toBe(want.in);
      expect(lockedOut(state, team, ownWins), `out, trial ${trial}`).toBe(want.out);
      if (want.in) ins++;
      if (want.out) outs++;
    }
    // The random leagues have to exercise both answers to mean anything.
    expect(ins).toBeGreaterThan(20);
    expect(outs).toBeGreaterThan(20);
  });

  it("counts a possible tie against a clinch", () => {
    // Top 1 of 2: B can still match A's three wins, and points break the tie.
    const state: OpenState = { wins: { A: 3, B: 2 }, open: [game(1, "B", "C")], playoffTeams: 1 };
    state.wins.C = 0;
    expect(lockedIn(state, "A", new Set())).toBe(false);
    expect(lockedIn({ ...state, wins: { A: 4, B: 2, C: 0 } }, "A", new Set())).toBe(true);
  });
});

describe("exactPicture", () => {
  // Four teams, top two get in, two weeks left.
  const open = [game(1, "A", "B"), game(1, "C", "D"), game(2, "A", "C"), game(2, "B", "D")];
  const state: OpenState = { wins: { A: 5, B: 3, C: 3, D: 1 }, open, playoffTeams: 2 };

  it("finds the clinch number", () => {
    const a = exactPicture(state, "A");
    // One more win puts A on 6; B and C max out at 5 and 5.
    expect(a.clinchWins).toBe(1);
    expect(a.rows.map((r) => r.lock)).toEqual([null, "in", "in"]);
    expect(a.elimLosses).toBeNull();
  });

  it("finds the elimination number", () => {
    const d = exactPicture(state, "D");
    // D tops out at 3 wins. Losing once leaves it on 2 at best with A, B and
    // C all at 3 or more.
    expect(d.elimLosses).toBe(1);
    expect(d.clinchWins).toBeNull();
    expect(d.rows[0].lock).toBe("out");
  });

  it("reports a team that is already in", () => {
    const done: OpenState = { wins: { A: 9, B: 3, C: 3, D: 1 }, open, playoffTeams: 2 };
    expect(exactPicture(done, "A").clinchWins).toBe(0);
  });

  it("reports a team that is already out", () => {
    const done: OpenState = { wins: { A: 9, B: 8, C: 3, D: 1 }, open, playoffTeams: 2 };
    const d = exactPicture(done, "D");
    expect(d.elimLosses).toBe(0);
    expect(d.rows.every((r) => r.lock === "out")).toBe(true);
  });
});
