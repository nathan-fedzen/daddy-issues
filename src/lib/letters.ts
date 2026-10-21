import { promises as fs } from "node:fs";
import path from "node:path";

import { LETTER_MAX, NAME_MAX } from "./letter-limits";

export { LETTER_MAX, NAME_MAX };

export interface Letter {
  season: number;
  week: number;
  name: string;
  body: string;
  postedAt: string;
}

export interface LetterStore {
  list(season: number, week: number): Promise<Letter[]>;
  add(letter: Letter): Promise<void>;
}

export function letterPrefix(season: number, week: number): string {
  return `letters/${season}/week-${String(week).padStart(2, "0")}/`;
}

export function letterKey(letter: Letter): string {
  return `${letterPrefix(letter.season, letter.week)}${Date.parse(letter.postedAt)}.json`;
}

export type Validated = { ok: true; name: string; body: string } | { ok: false; error: string };

export function validateLetter(input: { name: unknown; body: unknown }): Validated {
  const name = String(input.name ?? "").replace(/\s+/g, " ").trim();
  const body = String(input.body ?? "").replace(/\r\n/g, "\n").trim();
  if (!name) return { ok: false, error: "Sign it. The editor does not print anonymous mail." };
  if (name.length > NAME_MAX) return { ok: false, error: `Names are ${NAME_MAX} characters or fewer.` };
  if (!body) return { ok: false, error: "Say something." };
  if (body.length > LETTER_MAX) return { ok: false, error: `Letters are ${LETTER_MAX} characters or fewer. Edit it down, like the editor has to.` };
  return { ok: true, name, body };
}

export function sameName(a: string, b: string): boolean {
  return a.trim().toLowerCase() === b.trim().toLowerCase();
}

export function alreadyWrote(letters: Letter[], name: string): boolean {
  return letters.some((l) => sameName(l.name, name));
}

export class FileLetterStore implements LetterStore {
  constructor(private readonly root = path.join(process.cwd(), "data")) {}

  private dir(season: number, week: number): string {
    return path.join(this.root, letterPrefix(season, week));
  }

  async list(season: number, week: number): Promise<Letter[]> {
    let names: string[];
    try {
      names = await fs.readdir(this.dir(season, week));
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code === "ENOENT") return [];
      throw err;
    }
    const letters = await Promise.all(
      names
        .filter((n) => n.endsWith(".json"))
        .map(async (n) => JSON.parse(await fs.readFile(path.join(this.dir(season, week), n), "utf8")) as Letter),
    );
    return sortLetters(letters);
  }

  async add(letter: Letter): Promise<void> {
    const file = path.join(this.root, letterKey(letter));
    await fs.mkdir(path.dirname(file), { recursive: true });
    await fs.writeFile(file, JSON.stringify(letter, null, 2));
  }
}

function blobAccess(): "private" | "public" {
  return process.env.BLOB_ACCESS === "public" ? "public" : "private";
}

// Letters live in the same private store as the issues.
export class BlobLetterStore implements LetterStore {
  async list(season: number, week: number): Promise<Letter[]> {
    const { list, get } = await import("@vercel/blob");
    const { blobs } = await list({ prefix: letterPrefix(season, week) });
    const letters = await Promise.all(
      blobs.map(async (b) => {
        const result = await get(b.pathname, { access: blobAccess(), useCache: false });
        if (!result || !result.stream) return null;
        return JSON.parse(await new Response(result.stream).text()) as Letter;
      }),
    );
    return sortLetters(letters.filter((l): l is Letter => l !== null));
  }

  async add(letter: Letter): Promise<void> {
    const { put } = await import("@vercel/blob");
    await put(letterKey(letter), JSON.stringify(letter), {
      access: blobAccess(),
      addRandomSuffix: false,
      allowOverwrite: false,
      contentType: "application/json",
    });
  }
}

function sortLetters(letters: Letter[]): Letter[] {
  return [...letters].sort((a, b) => a.postedAt.localeCompare(b.postedAt));
}

export const LETTERS_TAG = "letters";

export function letterStoreFromEnv(): LetterStore {
  if (process.env.BLOB_READ_WRITE_TOKEN) return new BlobLetterStore();
  return new FileLetterStore();
}

export function passcodeValid(given: unknown): boolean {
  const expected = process.env.LEAGUE_PASSCODE;
  return Boolean(expected) && String(given ?? "").trim() === expected;
}
