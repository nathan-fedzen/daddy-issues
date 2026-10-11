import type { LeagueSnapshot } from "@/lib/model";
import { buildFacts } from "@/lib/facts";
import { fetchSnapshot } from "@/lib/espn/fetch-snapshot";
import { writerFromEnv, type Writer } from "@/lib/writer/writer";
import { storeFromEnv, type Issue, type IssueStore } from "@/lib/issues/store";
import { gifSearchFromEnv, resolveGifs, type GifSearch } from "@/lib/gifs";

export interface GenerateOptions {
  week?: number;
  snapshot?: LeagueSnapshot;
  writer?: Writer;
  store?: IssueStore;
  gifs?: GifSearch | null;
  publish?: boolean;
  now?: Date;
}

export function autoPublish(): boolean {
  return process.env.AUTO_PUBLISH === "true";
}

export async function generateIssue(options: GenerateOptions = {}): Promise<Issue> {
  const now = options.now ?? new Date();
  const snapshot = options.snapshot ?? (await fetchSnapshot(options.week));
  const facts = buildFacts(snapshot, now);
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
  await (options.store ?? storeFromEnv()).put(issue);
  return issue;
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

export async function publishIssue(season: number, week: number, store = storeFromEnv()): Promise<Issue | null> {
  const issue = await store.get(season, week);
  if (!issue) return null;
  if (issue.status === "published") return issue;
  const published: Issue = { ...issue, status: "published", publishedAt: new Date().toISOString() };
  await store.put(published);
  return published;
}
