import { league } from "@/config/league";
import { chugListOf, type Facts, type TeamRef } from "@/lib/facts";
import type { WeekFacts } from "@/lib/season";

export type AwardKey = "belt" | "dumpster" | "couch" | "lucky" | "robbed" | "hammer" | "churn" | "chug";

export const AWARD_KEYS: AwardKey[] = ["belt", "dumpster", "couch", "lucky", "robbed", "hammer", "churn", "chug"];

// What each trophy is for; the display names live in the league config.
export const AWARD_BLURBS: Record<AwardKey, string> = {
  belt: "Highest score of the week",
  dumpster: "Lowest score of the week",
  couch: "Most points left on the bench",
  lucky: "Won with a score most of the league would have lost with",
  robbed: "Lost with a score most of the league would have won with",
  hammer: "Biggest margin of victory",
  churn: "Most roster moves",
  chug: "Started a player who scored exactly zero",
};

export interface AwardWinner extends TeamRef {
  detail: string;
}

export interface Award {
  key: AwardKey;
  name: string;
  blurb: string;
  winners: AwardWinner[];
}

export function awardName(key: AwardKey): string {
  return league.trophies?.[key] ?? key;
}

function ref(x: TeamRef): TeamRef {
  return { teamId: x.teamId, teamName: x.teamName, owner: x.owner };
}

function ordinal(n: number): string {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return `${n}${s[(v - 20) % 10] ?? s[v] ?? s[0]}`;
}

// Everything is read off one week's facts, so the awards an issue shows can
// never disagree with its scoreboard.
export function weekAwards(facts: Facts, options: { chugRule?: boolean } = {}): Award[] {
  const out: Award[] = [];
  const add = (key: AwardKey, winners: AwardWinner[]) => {
    if (winners.length) out.push({ key, name: awardName(key), blurb: AWARD_BLURBS[key], winners });
  };
  const s = facts.superlatives;

  if (s.highScore) add("belt", [{ ...ref(s.highScore), detail: `${s.highScore.points.toFixed(2)} points` }]);
  if (s.lowScore) add("dumpster", [{ ...ref(s.lowScore), detail: `${s.lowScore.points.toFixed(2)} points` }]);

  const couch = [...(facts.lineups ?? [])].sort((a, b) => b.pointsLeft - a.pointsLeft)[0];
  if (couch && couch.pointsLeft > 0) {
    add("couch", [
      { ...ref(couch), detail: `${couch.pointsLeft.toFixed(1)} on the bench${couch.wouldHaveWon ? ", and it cost the game" : ""}` },
    ]);
  }

  const lucky = facts.luck?.luckiestWin;
  if (lucky && lucky.wouldBeat < lucky.outOf / 2) {
    add("lucky", [{ ...ref(lucky), detail: `won with the ${ordinal(lucky.outOf + 1 - lucky.wouldBeat)} best score` }]);
  }
  const robbed = facts.luck?.unluckiestLoss;
  if (robbed && robbed.wouldBeat > robbed.outOf / 2) {
    add("robbed", [{ ...ref(robbed), detail: `lost with the ${ordinal(robbed.outOf + 1 - robbed.wouldBeat)} best score` }]);
  }

  if (s.blowout && !s.blowout.tie) {
    add("hammer", [{ ...ref(s.blowout.winner), detail: `beat ${s.blowout.loser.owner} by ${s.blowout.margin.toFixed(2)}` }]);
  }

  const churn = facts.transactions?.churnKing;
  if (churn && churn.moves > 0) add("churn", [{ ...ref(churn), detail: `${churn.moves} moves in a week` }]);

  if (options.chugRule !== false) {
    const seen = new Map<string, AwardWinner>();
    for (const c of chugListOf(facts)) {
      const cur = seen.get(c.teamId);
      seen.set(c.teamId, cur ? { ...cur, detail: `${cur.detail}, ${c.player}` } : { ...ref(c), detail: c.player });
    }
    add("chug", [...seen.values()]);
  }
  return out;
}

export interface Shelf extends TeamRef {
  trophies: { key: AwardKey; name: string; blurb: string; weeks: number[] }[];
  total: number;
}

export function trophyCase(weeks: WeekFacts[]): Shelf[] {
  const shelves = new Map<string, Shelf>();
  for (const w of [...weeks].sort((a, b) => a.week - b.week)) {
    for (const award of weekAwards(w.facts, { chugRule: w.hasIssue !== false })) {
      for (const winner of award.winners) {
        const shelf = shelves.get(winner.teamId) ?? { ...ref(winner), trophies: [], total: 0 };
        let t = shelf.trophies.find((x) => x.key === award.key);
        if (!t) {
          t = { key: award.key, name: award.name, blurb: award.blurb, weeks: [] };
          shelf.trophies.push(t);
        }
        t.weeks.push(w.week);
        shelf.total++;
        shelves.set(winner.teamId, shelf);
      }
    }
  }
  for (const s of shelves.values()) {
    s.trophies.sort((a, b) => b.weeks.length - a.weeks.length || AWARD_KEYS.indexOf(a.key) - AWARD_KEYS.indexOf(b.key));
  }
  return [...shelves.values()].sort((a, b) => b.total - a.total || a.owner.localeCompare(b.owner));
}
