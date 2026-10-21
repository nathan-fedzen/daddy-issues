import { unstable_cache } from "next/cache";
import { league } from "@/config/league";
import type { WeekFacts } from "@/lib/season";
import { storeFromEnv, type Issue, type IssueSummary } from "./store";

export const ISSUES_TAG = "issues";
const CACHE_SECONDS = 300;

// Every page reads through here. Against Blob the results sit in Next's data
// cache for a few minutes (or until a write revalidates the tag), so a page
// view costs no Blob operations. The file store in dev stays uncached so
// edits under data/ show up immediately.
const cached = Boolean(process.env.BLOB_READ_WRITE_TOKEN);

const listIssues: (season: number) => Promise<IssueSummary[]> = cached
  ? unstable_cache((season: number) => storeFromEnv().list(season), ["issues-list"], {
      tags: [ISSUES_TAG],
      revalidate: CACHE_SECONDS,
    })
  : (season) => storeFromEnv().list(season);

const getIssue: (season: number, week: number) => Promise<Issue | null> = cached
  ? unstable_cache((season: number, week: number) => storeFromEnv().get(season, week), ["issues-get"], {
      tags: [ISSUES_TAG],
      revalidate: CACHE_SECONDS,
    })
  : (season, week) => storeFromEnv().get(season, week);

export async function publishedIssues(): Promise<IssueSummary[]> {
  const all = await listIssues(league.season);
  return all.filter((i) => i.status === "published");
}

export async function publishedIssuesWithFacts(): Promise<Issue[]> {
  const summaries = await publishedIssues();
  const issues = await Promise.all(summaries.map((s) => getIssue(s.season, s.week)));
  return issues.filter((i): i is Issue => i !== null && i.status === "published");
}

// Every week the season page may use: published issues plus facts-only weeks.
export async function seasonWeeks(): Promise<WeekFacts[]> {
  const all = await listIssues(league.season);
  const issues = await Promise.all(
    all.filter((s) => s.status === "published" || s.status === "facts").map((s) => getIssue(s.season, s.week)),
  );
  return issues
    .filter((i): i is Issue => i !== null)
    .map((i) => ({ week: i.week, facts: i.facts, hasIssue: i.status === "published" }));
}

export async function latestPublished(): Promise<Issue | null> {
  const [latest] = await publishedIssues();
  return latest ? getIssue(latest.season, latest.week) : null;
}

export async function publishedIssue(week: number): Promise<Issue | null> {
  const issue = await getIssue(league.season, week);
  return issue?.status === "published" ? issue : null;
}

export async function anyIssue(week: number): Promise<Issue | null> {
  return getIssue(league.season, week);
}

export function formatDate(iso: string | null): string {
  if (!iso) return "";
  return new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "America/Denver",
  }).format(new Date(iso));
}
