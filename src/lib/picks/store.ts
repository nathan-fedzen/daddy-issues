import { promises as fs } from "node:fs";
import path from "node:path";
import { league } from "@/config/league";

export interface PickSheet {
  season: number;
  week: number;
  // The voter's league team id; owner is denormalized for display.
  teamId: string;
  owner: string;
  // game key ("homeId-awayId") to the team id picked to win.
  picks: Record<string, string>;
  submittedAt: string;
}

export class PickExistsError extends Error {
  constructor(owner: string) {
    super(`${owner} already locked in picks this week.`);
  }
}

export interface PickStore {
  list(season: number): Promise<PickSheet[]>;
  listWeek(season: number, week: number): Promise<PickSheet[]>;
  // Writes one sheet, refusing a second from the same voter for the week.
  add(sheet: PickSheet): Promise<void>;
}

export const PICKS_TAG = "picks";

const pad = (week: number) => String(week).padStart(2, "0");

// One file per voter is the lock-in (never overwritten); one aggregate per
// week is what readers load, so a page view costs one read per week.
export function sheetKey(season: number, week: number, teamId: string): string {
  return `picks/${season}/week-${pad(week)}/t${teamId}.json`;
}

export function weekKey(season: number, week: number): string {
  return `picks/${season}/week-${pad(week)}.json`;
}

const WEEK_FILE = /week-(\d{2})\.json$/;

export function sortSheets(sheets: PickSheet[]): PickSheet[] {
  return [...sheets].sort((a, b) => a.week - b.week || a.submittedAt.localeCompare(b.submittedAt));
}

export type ValidatedSheet =
  | { ok: true; teamId: string; owner: string; picks: Record<string, string> }
  | { ok: false; error: string };

// Every game must be picked, every pick must be one of that game's two teams,
// and the voter must be someone in the league.
export function validateSheet(
  input: { teamId: unknown; picks: Record<string, unknown> },
  games: { key: string; homeId: string; awayId: string }[],
): ValidatedSheet {
  const teamId = String(input.teamId ?? "");
  const owner = league.teams[teamId]?.owner?.trim();
  if (!owner) return { ok: false, error: "Pick your name from the list." };
  if (games.length === 0) return { ok: false, error: "No games on the slate this week." };
  const picks: Record<string, string> = {};
  for (const g of games) {
    const pick = String(input.picks[g.key] ?? "");
    if (pick !== g.homeId && pick !== g.awayId) {
      return { ok: false, error: "Pick a winner in every game before you lock in." };
    }
    picks[g.key] = pick;
  }
  return { ok: true, teamId, owner, picks };
}

export class FilePickStore implements PickStore {
  constructor(private readonly root = path.join(process.cwd(), "data")) {}

  private file(key: string): string {
    return path.join(this.root, key);
  }

  async list(season: number): Promise<PickSheet[]> {
    let names: string[];
    try {
      names = await fs.readdir(path.join(this.root, "picks", String(season)));
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code === "ENOENT") return [];
      throw err;
    }
    const weeks = await Promise.all(
      names
        .map((n) => n.match(WEEK_FILE))
        .filter((m): m is RegExpMatchArray => m !== null)
        .map((m) => this.listWeek(season, Number(m[1]))),
    );
    return sortSheets(weeks.flat());
  }

  async listWeek(season: number, week: number): Promise<PickSheet[]> {
    try {
      return sortSheets(JSON.parse(await fs.readFile(this.file(weekKey(season, week)), "utf8")) as PickSheet[]);
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code === "ENOENT") return [];
      throw err;
    }
  }

  async add(sheet: PickSheet): Promise<void> {
    const file = this.file(sheetKey(sheet.season, sheet.week, sheet.teamId));
    await fs.mkdir(path.dirname(file), { recursive: true });
    try {
      await fs.writeFile(file, JSON.stringify(sheet, null, 2), { flag: "wx" });
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code === "EEXIST") throw new PickExistsError(sheet.owner);
      throw err;
    }
    await this.rebuild(sheet.season, sheet.week);
  }

  private async rebuild(season: number, week: number): Promise<void> {
    const dir = path.dirname(this.file(sheetKey(season, week, "0")));
    const names = (await fs.readdir(dir)).filter((n) => n.endsWith(".json"));
    const sheets = await Promise.all(
      names.map(async (n) => JSON.parse(await fs.readFile(path.join(dir, n), "utf8")) as PickSheet),
    );
    await fs.writeFile(this.file(weekKey(season, week)), JSON.stringify(sortSheets(sheets), null, 2));
  }
}

function blobAccess(): "private" | "public" {
  return process.env.BLOB_ACCESS === "public" ? "public" : "private";
}

// Picks live in the same private store as the issues and letters.
export class BlobPickStore implements PickStore {
  private async read(pathname: string): Promise<PickSheet[] | PickSheet | null> {
    const { get } = await import("@vercel/blob");
    const result = await get(pathname, { access: blobAccess(), useCache: false });
    if (!result || !result.stream) return null;
    return JSON.parse(await new Response(result.stream).text());
  }

  async list(season: number): Promise<PickSheet[]> {
    const { list } = await import("@vercel/blob");
    const { blobs } = await list({ prefix: `picks/${season}/week-` });
    const weeks = await Promise.all(
      blobs.filter((b) => WEEK_FILE.test(b.pathname)).map((b) => this.read(b.pathname) as Promise<PickSheet[] | null>),
    );
    return sortSheets(weeks.flatMap((w) => w ?? []));
  }

  async listWeek(season: number, week: number): Promise<PickSheet[]> {
    const sheets = (await this.read(weekKey(season, week))) as PickSheet[] | null;
    return sortSheets(sheets ?? []);
  }

  async add(sheet: PickSheet): Promise<void> {
    const { put } = await import("@vercel/blob");
    try {
      await put(sheetKey(sheet.season, sheet.week, sheet.teamId), JSON.stringify(sheet), {
        access: blobAccess(),
        addRandomSuffix: false,
        allowOverwrite: false,
        contentType: "application/json",
      });
    } catch (err) {
      if (err instanceof Error && /already exists/i.test(err.message)) throw new PickExistsError(sheet.owner);
      throw err;
    }
    await this.rebuild(sheet.season, sheet.week);
  }

  // Two people locking in within the same second could both rebuild from a
  // listing that misses the other; the second listing pass closes that gap.
  private async rebuild(season: number, week: number): Promise<void> {
    const first = await this.collect(season, week);
    await this.writeWeek(season, week, first);
    const second = await this.collect(season, week);
    if (second.length !== first.length) await this.writeWeek(season, week, second);
  }

  private async collect(season: number, week: number): Promise<PickSheet[]> {
    const { list } = await import("@vercel/blob");
    const { blobs } = await list({ prefix: `picks/${season}/week-${pad(week)}/` });
    const sheets = await Promise.all(blobs.map((b) => this.read(b.pathname) as Promise<PickSheet | null>));
    return sortSheets(sheets.filter((s): s is PickSheet => s !== null));
  }

  private async writeWeek(season: number, week: number, sheets: PickSheet[]): Promise<void> {
    const { put } = await import("@vercel/blob");
    await put(weekKey(season, week), JSON.stringify(sheets), {
      access: blobAccess(),
      addRandomSuffix: false,
      allowOverwrite: true,
      contentType: "application/json",
    });
  }
}

export function pickStoreFromEnv(): PickStore {
  if (process.env.BLOB_READ_WRITE_TOKEN) return new BlobPickStore();
  return new FilePickStore();
}
