import type { BoxPlayerFact, Facts } from "@/lib/facts";

export type LeadReason = "did-not-play" | "zero" | "injured" | "bust" | "benched-star" | "top-player" | "boom";

export interface Lead {
  player: string;
  position: string;
  proTeam: string;
  owner: string;
  slot: string;
  points: number;
  projected: number;
  line: string;
  reasons: LeadReason[];
}

export const MAX_LEADS = 24;
const PRIORITY: LeadReason[] = ["did-not-play", "zero", "injured", "bust", "benched-star", "top-player", "boom"];
const BUST_MIN_PROJECTION = 10;
const BUST_SHARE = 0.4;
const BOOM_POINTS = 25;
const BOOM_MIN_PROJECTION = 8;
const BENCH_STAR_POINTS = 20;
const SWAP_GAIN = 15;
const INJURED = new Set(["OUT", "IR", "DOUBTFUL"]);

type LeadBase = Omit<Lead, "owner" | "reasons">;

// Picks the players whose week needs explaining before anyone writes about
// it: no-shows, zeros, starters now listed as hurt, busts against projection,
// benched stars and booms.
export function researchLeads(facts: Facts, limit = MAX_LEADS): Lead[] {
  const leads = new Map<string, Lead>();
  const add = (owner: string, p: LeadBase, reason: LeadReason) => {
    const key = `${owner}:${p.player}`;
    const existing = leads.get(key);
    if (existing) {
      if (!existing.reasons.includes(reason)) existing.reasons.push(reason);
      return;
    }
    leads.set(key, { owner, ...p, reasons: [reason] });
  };
  const fromBox = (p: BoxPlayerFact): LeadBase => ({
    player: p.name,
    position: p.position,
    proTeam: p.proTeam,
    slot: p.slot,
    points: p.points,
    projected: p.projected,
    line: p.line,
  });

  for (const team of facts.boxScores ?? []) {
    for (const p of team.starters) {
      if (!p.played) add(team.owner, fromBox(p), "did-not-play");
      else if (p.points === 0) add(team.owner, fromBox(p), "zero");
      if (p.played && p.projected >= BUST_MIN_PROJECTION && p.points < p.projected * BUST_SHARE) {
        add(team.owner, fromBox(p), "bust");
      }
      if (p.points >= BOOM_POINTS || (p.projected >= BOOM_MIN_PROJECTION && p.points >= p.projected * 2)) {
        add(team.owner, fromBox(p), "boom");
      }
    }
    for (const p of team.bench) {
      if (p.points >= BENCH_STAR_POINTS) add(team.owner, fromBox(p), "benched-star");
    }
  }

  if (!facts.boxScores) {
    for (const c of facts.chugList) {
      add(c.owner, { player: c.player, position: c.position, proTeam: "", slot: c.slot, points: 0, projected: 0, line: "" }, "zero");
    }
    for (const l of facts.lineups) {
      const swap = l.worstSwap;
      if (!swap || swap.gain < SWAP_GAIN) continue;
      const b = swap.benched;
      add(
        l.owner,
        { player: b.name, position: b.position, proTeam: b.proTeam, slot: b.slot, points: b.points, projected: b.projected, line: "" },
        "benched-star",
      );
    }
  }

  const byOwnerAndName = new Map<string, BoxPlayerFact>();
  for (const team of facts.boxScores ?? []) {
    for (const p of [...team.starters, ...team.bench]) byOwnerAndName.set(`${team.owner}:${p.name}`, p);
  }
  for (const i of facts.injuries) {
    if (!i.wasStarterLastWeek || !INJURED.has(i.status)) continue;
    const box = byOwnerAndName.get(`${i.owner}:${i.player}`);
    add(
      i.owner,
      box ? fromBox(box) : { player: i.player, position: i.position, proTeam: "", slot: "", points: 0, projected: 0, line: "" },
      "injured",
    );
  }

  const top = facts.superlatives.topPlayer;
  if (top) {
    const p = top.player;
    add(
      top.owner,
      { player: p.name, position: p.position, proTeam: p.proTeam, slot: p.slot, points: p.points, projected: p.projected, line: p.box?.line ?? "" },
      "top-player",
    );
  }

  const rank = (l: Lead) => Math.min(...l.reasons.map((r) => PRIORITY.indexOf(r)));
  const swing = (l: Lead) => Math.abs(l.points - l.projected);
  return [...leads.values()]
    .map((l) => ({ ...l, reasons: [...l.reasons].sort((a, b) => PRIORITY.indexOf(a) - PRIORITY.indexOf(b)) }))
    .sort((a, b) => rank(a) - rank(b) || swing(b) - swing(a))
    .slice(0, limit);
}
