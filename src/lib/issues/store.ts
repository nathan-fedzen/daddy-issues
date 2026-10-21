import { promises as fs } from "node:fs";
import path from "node:path";
import type { Facts } from "@/lib/facts";

// "facts" is a week with no newsletter: backfilled facts only, so the season
// page covers weeks before the first issue. It never lists as a back issue.
export type IssueStatus = "draft" | "published" | "facts";

export interface Issue {
  season: number;
  week: number;
  status: IssueStatus;
  headline: string;
  markdown: string;
  // The writer's raw output with {{gif: ...}} cues intact, so GIFs can be
  // resolved again without another writer call.
  source: string;
  facts: Facts;
  model: string;
  generatedAt: string;
  publishedAt: string | null;
}

export interface IssueSummary {
  season: number;
  week: number;
  status: IssueStatus;
  headline: string;
  publishedAt: string | null;
}

export interface IssueStore {
  get(season: number, week: number): Promise<Issue | null>;
  list(season: number): Promise<IssueSummary[]>;
  put(issue: Issue): Promise<void>;
}

export function issueKey(season: number, week: number): string {
  return `issues/${season}/week-${String(week).padStart(2, "0")}.json`;
}

function summarize(issue: Issue): IssueSummary {
  return {
    season: issue.season,
    week: issue.week,
    status: issue.status,
    headline: issue.headline,
    publishedAt: issue.publishedAt,
  };
}

export class FileIssueStore implements IssueStore {
  constructor(private readonly root = path.join(process.cwd(), "data")) {}

  private file(season: number, week: number): string {
    return path.join(this.root, issueKey(season, week));
  }

  async get(season: number, week: number): Promise<Issue | null> {
    try {
      return JSON.parse(await fs.readFile(this.file(season, week), "utf8")) as Issue;
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code === "ENOENT") return null;
      throw err;
    }
  }

  async list(season: number): Promise<IssueSummary[]> {
    const dir = path.join(this.root, "issues", String(season));
    let names: string[];
    try {
      names = await fs.readdir(dir);
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code === "ENOENT") return [];
      throw err;
    }
    const issues = await Promise.all(
      names
        .filter((n) => n.endsWith(".json"))
        .map(async (n) => JSON.parse(await fs.readFile(path.join(dir, n), "utf8")) as Issue),
    );
    return issues.map(summarize).sort((a, b) => b.week - a.week);
  }

  async put(issue: Issue): Promise<void> {
    const file = this.file(issue.season, issue.week);
    await fs.mkdir(path.dirname(file), { recursive: true });
    await fs.writeFile(file, JSON.stringify(issue, null, 2));
  }
}

// Reads that hit the Blob CDN cache are free on every plan; uncached reads
// count against a small monthly quota that locks the store for 30 days when
// exceeded. Overwritten issues go stale for at most this long.
export const BLOB_CACHE_SECONDS = 60;

// Stores are private by default so drafts never sit on a guessable public
// URL; set BLOB_ACCESS=public only if the store was created that way.
function blobAccess(): "private" | "public" {
  return process.env.BLOB_ACCESS === "public" ? "public" : "private";
}

export class BlobIssueStore implements IssueStore {
  private async read(pathname: string): Promise<Issue | null> {
    const { get } = await import("@vercel/blob");
    try {
      const result = await get(pathname, { access: blobAccess() });
      if (!result || !result.stream) return null;
      return JSON.parse(await new Response(result.stream).text()) as Issue;
    } catch (err) {
      if (isBlobNotFound(err)) return null;
      throw err;
    }
  }

  async get(season: number, week: number): Promise<Issue | null> {
    return this.read(issueKey(season, week));
  }

  async list(season: number): Promise<IssueSummary[]> {
    const { list } = await import("@vercel/blob");
    const { blobs } = await list({ prefix: `issues/${season}/` });
    const issues = await Promise.all(blobs.map((b) => this.read(b.pathname)));
    return issues
      .filter((i): i is Issue => i !== null)
      .map(summarize)
      .sort((a, b) => b.week - a.week);
  }

  async put(issue: Issue): Promise<void> {
    const { put } = await import("@vercel/blob");
    await put(issueKey(issue.season, issue.week), JSON.stringify(issue), {
      access: blobAccess(),
      addRandomSuffix: false,
      allowOverwrite: true,
      contentType: "application/json",
      cacheControlMaxAge: BLOB_CACHE_SECONDS,
    });
  }
}

function isBlobNotFound(err: unknown): boolean {
  return err instanceof Error && err.constructor.name === "BlobNotFoundError";
}

export function storeFromEnv(): IssueStore {
  if (process.env.BLOB_READ_WRITE_TOKEN) return new BlobIssueStore();
  if (process.env.VERCEL) {
    throw new Error("BLOB_READ_WRITE_TOKEN is not set. Connect a Vercel Blob store to this project.");
  }
  return new FileIssueStore();
}
