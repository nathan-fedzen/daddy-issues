import { promises as fs } from "node:fs";
import path from "node:path";
import type { Facts } from "@/lib/facts";

export type IssueStatus = "draft" | "published";

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

export class BlobIssueStore implements IssueStore {
  async get(season: number, week: number): Promise<Issue | null> {
    const { head } = await import("@vercel/blob");
    try {
      const meta = await head(issueKey(season, week));
      const res = await fetch(meta.url, { cache: "no-store" });
      if (!res.ok) return null;
      return (await res.json()) as Issue;
    } catch (err) {
      if (isBlobNotFound(err)) return null;
      throw err;
    }
  }

  async list(season: number): Promise<IssueSummary[]> {
    const { list } = await import("@vercel/blob");
    const { blobs } = await list({ prefix: `issues/${season}/` });
    const issues = await Promise.all(
      blobs.map(async (b) => {
        const res = await fetch(b.url, { cache: "no-store" });
        return (await res.json()) as Issue;
      }),
    );
    return issues.map(summarize).sort((a, b) => b.week - a.week);
  }

  async put(issue: Issue): Promise<void> {
    const { put } = await import("@vercel/blob");
    await put(issueKey(issue.season, issue.week), JSON.stringify(issue), {
      access: "public",
      addRandomSuffix: false,
      allowOverwrite: true,
      contentType: "application/json",
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
