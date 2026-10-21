import { league } from "@/config/league";
import type { WeekFacts } from "@/lib/season";
import { storeFromEnv, type Issue, type IssueSummary } from "./store";

export async function publishedIssues(): Promise<IssueSummary[]> {
  const all = await storeFromEnv().list(league.season);
  return all.filter((i) => i.status === "published");
}

export async function publishedIssuesWithFacts(): Promise<Issue[]> {
  const store = storeFromEnv();
  const summaries = await publishedIssues();
  const issues = await Promise.all(summaries.map((s) => store.get(s.season, s.week)));
  return issues.filter((i): i is Issue => i !== null && i.status === "published");
}

// Every week the season page may use: published issues plus facts-only weeks.
export async function seasonWeeks(): Promise<WeekFacts[]> {
  const store = storeFromEnv();
  const all = await store.list(league.season);
  const issues = await Promise.all(
    all.filter((s) => s.status === "published" || s.status === "facts").map((s) => store.get(s.season, s.week)),
  );
  return issues
    .filter((i): i is Issue => i !== null)
    .map((i) => ({ week: i.week, facts: i.facts, hasIssue: i.status === "published" }));
}

export async function latestPublished(): Promise<Issue | null> {
  const [latest] = await publishedIssues();
  return latest ? storeFromEnv().get(latest.season, latest.week) : null;
}

export async function publishedIssue(week: number): Promise<Issue | null> {
  const issue = await storeFromEnv().get(league.season, week);
  return issue?.status === "published" ? issue : null;
}

export async function anyIssue(week: number): Promise<Issue | null> {
  return storeFromEnv().get(league.season, week);
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
