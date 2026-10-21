import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterAll, describe, expect, it } from "vitest";
import { alreadyWrote, FileLetterStore, letterKey, validateLetter, type Letter } from "./letters";

describe("validateLetter", () => {
  it("trims, collapses whitespace in the name, and keeps line breaks in the body", () => {
    const v = validateLetter({ name: "  D J   Smith ", body: "line one\r\n\r\nline two  " });
    expect(v).toEqual({ ok: true, name: "D J Smith", body: "line one\n\nline two" });
  });

  it("rejects empty and oversized input", () => {
    expect(validateLetter({ name: "", body: "hi" }).ok).toBe(false);
    expect(validateLetter({ name: "DJ", body: "   " }).ok).toBe(false);
    expect(validateLetter({ name: "DJ", body: "x".repeat(501) }).ok).toBe(false);
    expect(validateLetter({ name: "x".repeat(41), body: "hi" }).ok).toBe(false);
  });
});

describe("alreadyWrote", () => {
  const letters: Letter[] = [{ season: 2026, week: 6, name: "DJ", body: "no", postedAt: "2026-10-21T00:00:00Z" }];
  it("matches names regardless of case and spacing", () => {
    expect(alreadyWrote(letters, " dj ")).toBe(true);
    expect(alreadyWrote(letters, "Dan")).toBe(false);
  });
});

describe("FileLetterStore", () => {
  const root = mkdtempSync(path.join(tmpdir(), "letters-"));
  afterAll(() => rmSync(root, { recursive: true, force: true }));

  it("round-trips letters in posting order", async () => {
    const store = new FileLetterStore(root);
    const later: Letter = { season: 2026, week: 6, name: "DJ", body: "later", postedAt: "2026-10-21T10:00:00.000Z" };
    const earlier: Letter = { season: 2026, week: 6, name: "Dan", body: "earlier", postedAt: "2026-10-21T09:00:00.000Z" };
    await store.add(later);
    await store.add(earlier);
    expect(await store.list(2026, 5)).toEqual([]);
    expect((await store.list(2026, 6)).map((l) => l.name)).toEqual(["Dan", "DJ"]);
    expect(letterKey(later)).toBe(`letters/2026/week-06/${Date.parse(later.postedAt)}.json`);
  });
});
