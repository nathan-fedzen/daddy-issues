import type { LeagueSnapshot } from "@/lib/model";
import { buildFacts, type Facts } from "@/lib/facts";
import { fetchSnapshot } from "@/lib/espn/fetch-snapshot";
import { writerFromEnv, type Writer } from "@/lib/writer/writer";
import { storeFromEnv, type Issue, type IssueStore } from "@/lib/issues/store";
import { gifSearchFromEnv, resolveGifs, type GifSearch } from "@/lib/gifs";
import { letterStoreFromEnv, type LetterStore } from "@/lib/letters";
import { researcherFromEnv, type Researcher } from "@/lib/research/researcher";
import { pickFacts } from "@/lib/picks/board";
import { pickStoreFromEnv, type PickStore } from "@/lib/picks/store";
import { ownerName } from "@/config/league";

export interface GenerateOptions {
  week?: number;
  snapshot?: LeagueSnapshot;
  writer?: Writer;
  store?: IssueStore;
  gifs?: GifSearch | null;
  // Reader letters from the previous week go into the facts; null skips them.
  letters?: LetterStore | null;
  // Looks up what happened in the NFL games before the writer runs; null skips it.
  research?: Researcher | null;
  // The week's pick'em ballots, graded into the facts; null skips them.
  picks?: PickStore | null;
  publish?: boolean;
  // A published issue is live for the league; only an explicit editor action
  // (review page, --force) may replace it.
  overwritePublished?: boolean;
  now?: Date;
}

export function autoPublish(): boolean {
  return process.env.AUTO_PUBLISH === "true";
}

export async function generateIssue(options: GenerateOptions = {}): Promise<Issue> {
  const now = options.now ?? new Date();
  const store = options.store ?? storeFromEnv();
  const snapshot = options.snapshot ?? (await fetchSnapshot(options.week));
  const existing = await store.get(snapshot.season, snapshot.week);
  if (existing?.status === "published" && !options.overwritePublished) {
    throw new Error(
      `Week ${snapshot.week} is already published. Pass --force (or regenerate from the review page) to replace it.`,
    );
  }
  const facts = buildFacts(snapshot, now);
  const letterStore = options.letters === undefined ? letterStoreFromEnv() : options.letters;
  if (letterStore && snapshot.week > 1) {
    facts.letters = (await letterStore.list(snapshot.season, snapshot.week - 1)).map((l) => ({
      name: l.name,
      body: l.body,
      aboutWeek: l.week,
    }));
  }
  const pickStore = options.picks === undefined ? pickStoreFromEnv() : options.picks;
  if (pickStore) {
    const sheets = await pickStore.list(snapshot.season);
    const teamName = (id: string) => snapshot.teams.find((t) => t.id === id)?.name ?? `Team ${id}`;
    const graded = pickFacts(
      sheets,
      snapshot.games,
      snapshot.week,
      (id) => ownerName(id, teamName(id)),
      snapshot.teams.map((t) => t.id),
    );
    if (graded) facts.picks = graded;
  }
  const researcher = options.research === undefined ? researcherFromEnv() : options.research;
  if (researcher) facts.research = await researcher.research(facts);
  const writer = options.writer ?? writerFromEnv();
  const draft = await writer.write(facts);
  const gifs = options.gifs === undefined ? gifSearchFromEnv() : options.gifs;
  const markdown = await resolveGifs(draft.markdown, `${snapshot.season}-${snapshot.week}`, gifs);
  const publish = options.publish ?? autoPublish();
  const issue: Issue = {
    season: snapshot.season,
    week: snapshot.week,
    status: publish ? "published" : "draft",
    headline: draft.headline,
    markdown,
    source: draft.markdown,
    facts,
    model: draft.model,
    generatedAt: now.toISOString(),
    publishedAt: publish ? now.toISOString() : null,
  };
  await store.put(issue);
  return issue;
}

// Fields added to Facts after an issue shipped can be filled in from a fresh
// snapshot without touching the prose or the numbers the writer already used.
export function mergeSiteFacts(existing: Facts, fresh: Facts): Facts {
  return { ...existing, games: fresh.games, robot: fresh.robot, benchAllStars: fresh.benchAllStars };
}

export async function regifIssue(
  season: number,
  week: number,
  store = storeFromEnv(),
  gifs = gifSearchFromEnv(),
): Promise<Issue | null> {
  const issue = await store.get(season, week);
  if (!issue) return null;
  const markdown = await resolveGifs(issue.source ?? issue.markdown, `${season}-${week}`, gifs);
  const updated: Issue = { ...issue, markdown };
  await store.put(updated);
  return updated;
}

export function factsOnlyIssue(facts: Facts, now: Date): Issue {
  return {
    season: facts.season,
    week: facts.week,
    status: "facts",
    headline: "",
    markdown: "",
    source: "",
    facts,
    model: "none",
    generatedAt: now.toISOString(),
    publishedAt: null,
  };
}

export async function publishIssue(season: number, week: number, store = storeFromEnv()): Promise<Issue | null> {
  const issue = await store.get(season, week);
  if (!issue) return null;
  if (issue.status === "published") return issue;
  if (issue.status === "facts") throw new Error(`Week ${week} has facts only, nothing to publish. Generate it first.`);
  const published: Issue = { ...issue, status: "published", publishedAt: new Date().toISOString() };
  await store.put(published);
  return published;
}
