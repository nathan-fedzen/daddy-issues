import { league, ownerName } from "@/config/league";
import type { Issue } from "@/lib/issues/store";
import { chugListOf } from "@/lib/facts";

export const CHUG_MAX_BYTES = 500 * 1024 * 1024;
export const CHUG_CONTENT_TYPES = [
  "video/mp4",
  "video/quicktime",
  "video/webm",
  "video/x-m4v",
  "video/3gpp",
];

// The store appends "-<random>" before the extension on upload.
const PATH = /^chugs\/(\d{4})\/week-(\d{2})\/t(\d+)-(\d{10,})(?:-[A-Za-z0-9]+)?\.([a-z0-9]{2,5})$/;

export interface ChugRef {
  season: number;
  week: number;
  teamId: string;
  uploadedMs: number;
  ext: string;
}

export interface ChugVideo extends ChugRef {
  pathname: string;
  url: string;
  owner: string;
  size: number;
}

export interface OwedChug {
  week: number;
  teamId: string;
  owner: string;
  player: string;
  slot: string;
}

export interface LedgerEntry extends OwedChug {
  video: ChugVideo | null;
}

export function chugToken(): string | undefined {
  return process.env.CHUG_BLOB_READ_WRITE_TOKEN || process.env.CHUG_READ_WRITE_TOKEN;
}

export function chugPathname(season: number, week: number, teamId: string, ext: string, now = Date.now()): string {
  return `chugs/${season}/week-${String(week).padStart(2, "0")}/t${teamId}-${now}.${ext.toLowerCase()}`;
}

export function parseChugPathname(pathname: string): ChugRef | null {
  const m = pathname.match(PATH);
  if (!m) return null;
  return { season: Number(m[1]), week: Number(m[2]), teamId: m[3], uploadedMs: Number(m[4]), ext: m[5] };
}

export function extensionFor(file: { name: string; type: string }): string {
  const fromName = file.name.split(".").pop()?.toLowerCase();
  if (fromName && /^[a-z0-9]{2,5}$/.test(fromName) && fromName !== file.name.toLowerCase()) return fromName;
  const byType: Record<string, string> = {
    "video/mp4": "mp4",
    "video/quicktime": "mov",
    "video/webm": "webm",
    "video/x-m4v": "m4v",
    "video/3gpp": "3gp",
  };
  return byType[file.type] ?? "mp4";
}

export function owedFromIssues(issues: Issue[]): OwedChug[] {
  return issues
    .filter((i) => i.status === "published")
    .flatMap((i) =>
      chugListOf(i.facts).map((c) => ({
        week: i.week,
        teamId: c.teamId,
        owner: c.owner,
        player: c.player,
        slot: c.slot,
      })),
    )
    .sort((a, b) => b.week - a.week || a.owner.localeCompare(b.owner));
}

// One video settles one debt; the earliest upload for a week pays the first
// listed debt, so a double-zero week needs two videos.
export function buildLedger(owed: OwedChug[], videos: ChugVideo[]): LedgerEntry[] {
  const pool = [...videos].sort((a, b) => a.uploadedMs - b.uploadedMs);
  return owed.map((o) => {
    const idx = pool.findIndex((v) => v.week === o.week && v.teamId === o.teamId);
    const video = idx >= 0 ? pool.splice(idx, 1)[0] : null;
    return { ...o, video };
  });
}

export async function listChugs(season = league.season): Promise<ChugVideo[]> {
  const token = chugToken();
  if (!token) return [];
  const { list } = await import("@vercel/blob");
  const out: ChugVideo[] = [];
  let cursor: string | undefined;
  do {
    const page = await list({ prefix: `chugs/${season}/`, token, cursor, limit: 1000 });
    for (const b of page.blobs) {
      const ref = parseChugPathname(b.pathname);
      if (!ref) continue;
      out.push({
        ...ref,
        pathname: b.pathname,
        url: b.url,
        owner: ownerName(ref.teamId, `Team ${ref.teamId}`),
        size: b.size,
      });
    }
    cursor = page.hasMore ? page.cursor : undefined;
  } while (cursor);
  return out.sort((a, b) => b.uploadedMs - a.uploadedMs);
}

export function teamChoices(): { teamId: string; owner: string }[] {
  return Object.entries(league.teams)
    .map(([teamId, t]) => ({ teamId, owner: t.owner.trim() || `Team ${teamId}` }))
    .sort((a, b) => a.owner.localeCompare(b.owner));
}
