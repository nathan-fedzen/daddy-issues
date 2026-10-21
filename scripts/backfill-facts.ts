import { readFileSync } from "node:fs";
import type { LeagueSnapshot } from "@/lib/model";
import { league } from "@/config/league";
import { buildFacts } from "@/lib/facts";
import { rewindSnapshot } from "@/lib/facts/rewind";
import { fetchSnapshot } from "@/lib/espn/fetch-snapshot";
import { FileIssueStore, storeFromEnv, type IssueStore } from "@/lib/issues/store";
import { factsOnlyIssue, mergeSiteFacts } from "@/lib/pipeline";

// Fills in facts for past weeks. A week with a stored issue keeps its prose
// and gains the site-only fields (games, robot, benchAllStars); a week with
// no issue gets a facts-only record so the season page covers it.
// Usage:
//   npm run backfill -- --week 5                 one week, active store
//   npm run backfill -- --from 1 --to 6 --local  a range, data/issues only
//   npm run backfill -- --week 4 --fixture data/fixtures/2026-week-04.snapshot.json
const args = process.argv.slice(2);
const flag = (name: string) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? (args[i + 1] ?? "") : undefined;
};
const single = flag("week") ? Number(flag("week")) : undefined;
const from = single ?? Number(flag("from"));
const to = single ?? Number(flag("to"));
if (!Number.isInteger(from) || !Number.isInteger(to) || from < 1 || to < from) {
  throw new Error("usage: --week <n> | --from <n> --to <n> [--local] [--fixture <path>]");
}

const WEEK_MS = 7 * 86_400_000;

// Weeks without an issue have nothing to date them, so count back a week at
// a time from the earliest written issue's generation time (a Tuesday).
async function anchor(store: IssueStore): Promise<{ week: number; at: Date } | null> {
  const written = (await store.list(league.season)).filter((s) => s.status !== "facts");
  if (written.length === 0) return null;
  const earliest = written.reduce((a, b) => (b.week < a.week ? b : a));
  const issue = await store.get(league.season, earliest.week);
  return issue ? { week: issue.week, at: new Date(issue.generatedAt) } : null;
}

async function main() {
  const store = args.includes("--local") ? new FileIssueStore() : storeFromEnv();
  const fixture = flag("fixture");
  const base = await anchor(store);
  for (let week = from; week <= to; week++) {
    const existing = await store.get(league.season, week);
    const written = existing && existing.status !== "facts" ? existing : null;
    const now = written
      ? new Date(written.generatedAt)
      : base
        ? new Date(base.at.getTime() + (week - base.week) * WEEK_MS)
        : new Date();
    const raw: LeagueSnapshot = fixture
      ? (JSON.parse(readFileSync(fixture, "utf8")) as LeagueSnapshot)
      : await fetchSnapshot(week);
    if (raw.week !== week) throw new Error(`Snapshot is week ${raw.week}, expected ${week}`);
    const facts = buildFacts(rewindSnapshot(raw, week, now), now);
    const issue = written ? { ...written, facts: mergeSiteFacts(written.facts, facts) } : factsOnlyIssue(facts, now);
    await store.put(issue);
    const top = issue.facts.teams[0];
    const robot = issue.facts.robot?.find((r) => r.teamId === league.robot?.teamId);
    console.log(
      `Week ${week} ${written ? `merged into ${written.status}` : "facts only"}: ` +
        `${issue.facts.games?.length ?? 0} games, top seed ${top?.owner} ${top?.record}` +
        (robot ? `, robot ${robot.robot} vs ${robot.owner} ${robot.actual}` : ""),
    );
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
