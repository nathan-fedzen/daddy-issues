import { readFileSync } from "node:fs";
import type { LeagueSnapshot } from "@/lib/model";
import { buildFacts } from "@/lib/facts";
import { generateIssue, regifIssue } from "@/lib/pipeline";
import { fetchSnapshot } from "@/lib/espn/fetch-snapshot";
import { league } from "@/config/league";
import { gifCues } from "@/lib/gifs";
import { FileIssueStore } from "@/lib/issues/store";
import { researchLeads } from "@/lib/research/leads";
import { researcherFromEnv } from "@/lib/research/researcher";

// Usage:
//   npm run generate -- --week 4                 fetch from ESPN, write issue
//   npm run generate -- --fixture data/fixtures/2026-week-04.snapshot.json
//   add --facts to print the facts JSON instead of writing an issue
//   add --research to print the research leads and notes instead of writing an issue
//   add --publish to publish immediately
//   add --local to write to data/issues even when the Blob token is set
//   npm run generate -- --week 4 --gifs-only     re-resolve GIF cues on the stored issue
const args = process.argv.slice(2);
const flag = (name: string) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? (args[i + 1] ?? "") : undefined;
};
const has = (name: string) => args.includes(`--${name}`);

async function main() {
  const fixture = flag("fixture");
  const week = flag("week") ? Number(flag("week")) : undefined;
  if (has("gifs-only")) {
    if (!week) throw new Error("--gifs-only needs --week");
    const issue = await regifIssue(league.season, week);
    if (!issue) throw new Error(`No stored issue for week ${week}`);
    console.log(`Week ${week}: ${gifCues(issue.source).length} cues, ${(issue.markdown.match(/!\[/g) ?? []).length} GIFs placed`);
    return;
  }
  const snapshot: LeagueSnapshot = fixture
    ? (JSON.parse(readFileSync(fixture, "utf8")) as LeagueSnapshot)
    : await fetchSnapshot(week);

  if (has("facts")) {
    console.log(JSON.stringify(buildFacts(snapshot), null, 2));
    return;
  }
  if (has("research")) {
    const facts = buildFacts(snapshot);
    const leads = researchLeads(facts);
    console.log(`${leads.length} leads`);
    for (const l of leads) {
      console.log(`- ${l.owner}: ${l.player} (${l.position}, ${l.slot}) ${l.points} vs ${l.projected} proj, ${l.line} [${l.reasons.join(", ")}]`);
    }
    const researcher = researcherFromEnv();
    if (!researcher) {
      console.log("Research is off (ROAST_RESEARCH=off).");
      return;
    }
    const started = Date.now();
    const notes = await researcher.research(facts);
    console.log(`${notes.length} notes in ${Math.round((Date.now() - started) / 1000)}s`);
    console.log(JSON.stringify(notes, null, 2));
    return;
  }
  const started = Date.now();
  const issue = await generateIssue({
    snapshot,
    store: has("local") ? new FileIssueStore() : undefined,
    publish: has("publish") ? true : undefined,
    overwritePublished: has("force"),
  });
  const seconds = Math.round((Date.now() - started) / 1000);
  console.log(`Week ${issue.week} ${issue.status}: ${issue.headline} (${gifCues(issue.source).length} gif cues, ${issue.facts.research?.length ?? 0} research notes, ${seconds}s)`);
  console.log(issue.markdown);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
