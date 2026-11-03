import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import type { LeagueSnapshot } from "@/lib/model";
import type { Issue, IssueStore, IssueSummary } from "@/lib/issues/store";
import type { LetterStore } from "@/lib/letters";
import { gameKey } from "@/lib/picks/board";
import type { PickSheet, PickStore } from "@/lib/picks/store";
import { StubResearcher } from "@/lib/research/researcher";
import { StubWriter } from "@/lib/writer/writer";
import { generateIssue, publishIssue } from "./pipeline";

class MemoryStore implements IssueStore {
  issues = new Map<string, Issue>();
  async get(season: number, week: number) {
    return this.issues.get(`${season}-${week}`) ?? null;
  }
  async list(): Promise<IssueSummary[]> {
    return [...this.issues.values()].map((i) => ({
      season: i.season,
      week: i.week,
      status: i.status,
      headline: i.headline,
      publishedAt: i.publishedAt,
    }));
  }
  async put(issue: Issue) {
    this.issues.set(`${issue.season}-${issue.week}`, issue);
  }
}

const snapshot = JSON.parse(
  readFileSync("data/fixtures/2026-week-04.snapshot.json", "utf8"),
) as LeagueSnapshot;

describe("generateIssue", () => {
  it("writes a draft with facts, source, and no GIF cues left behind", async () => {
    const store = new MemoryStore();
    const issue = await generateIssue({ snapshot, store, writer: new StubWriter(), gifs: null, research: null, picks: null });
    expect(issue.status).toBe("draft");
    expect(issue.week).toBe(4);
    expect(issue.facts.results).toHaveLength(7);
    expect(issue.facts.chugList.map((c) => c.player)).toEqual(["Ladd McConkey", "Jets D/ST", "Rashee Rice"]);
    expect(issue.markdown).not.toContain("{{");
    expect(await store.get(2026, 4)).toEqual(issue);
  });

  it("attaches the previous week's letters to the facts", async () => {
    const store = new MemoryStore();
    const letters: LetterStore = {
      async list(_season, week) {
        return week === 3 ? [{ season: 2026, week: 3, name: "DJ", body: "unfair", postedAt: "2026-10-01T00:00:00Z" }] : [];
      },
      async add() {},
    };
    const issue = await generateIssue({ snapshot, store, writer: new StubWriter(), gifs: null, letters, research: null, picks: null });
    expect(issue.facts.letters).toEqual([{ name: "DJ", body: "unfair", aboutWeek: 3 }]);
    const silent = await generateIssue({ snapshot, store, writer: new StubWriter(), gifs: null, letters: null, research: null, picks: null });
    expect(silent.facts.letters).toBeUndefined();
  });

  it("runs the research desk before the writer and keeps its notes on the facts", async () => {
    const store = new MemoryStore();
    const issue = await generateIssue({
      snapshot,
      store,
      writer: new StubWriter(),
      gifs: null,
      letters: null,
      research: new StubResearcher(),
      picks: null,
    });
    expect(issue.facts.research?.length).toBeGreaterThan(0);
    expect(issue.facts.research?.map((n) => n.player)).toContain("Ladd McConkey");
    const skipped = await generateIssue({ snapshot, store, writer: new StubWriter(), gifs: null, letters: null, research: null, picks: null });
    expect(skipped.facts.research).toBeUndefined();
  });

  it("refuses to overwrite a published issue unless told to", async () => {
    const store = new MemoryStore();
    await generateIssue({ snapshot, store, writer: new StubWriter(), gifs: null, research: null, picks: null, publish: true });
    await expect(
      generateIssue({ snapshot, store, writer: new StubWriter(), gifs: null, research: null, picks: null }),
    ).rejects.toThrow(/already published/);
    const replaced = await generateIssue({
      snapshot,
      store,
      writer: new StubWriter(),
      gifs: null,
      research: null, picks: null,
      overwritePublished: true,
    });
    expect(replaced.status).toBe("draft");
  });
});

describe("generateIssue picks", () => {
  it("grades the week's ballots into the facts", async () => {
    const weekGames = snapshot.games.filter((g) => g.week === 4);
    const sheet: PickSheet = {
      season: 2026,
      week: 4,
      teamId: "9",
      owner: "Daniel",
      picks: Object.fromEntries(weekGames.map((g) => [gameKey(g), g.homeId])),
      submittedAt: "2026-10-01T00:00:00Z",
    };
    const picks: PickStore = {
      async list() {
        return [sheet];
      },
      async listWeek() {
        return [sheet];
      },
      async add() {},
    };
    const issue = await generateIssue({
      snapshot,
      store: new MemoryStore(),
      writer: new StubWriter(),
      gifs: null,
      letters: null,
      research: null,
      picks,
    });
    expect(issue.facts.picks?.voters).toBe(1);
    expect(issue.facts.picks?.records[0].owner).toBe("Daniel");
    const r = issue.facts.picks!.records[0];
    expect(r.correct + r.wrong).toBe(weekGames.length);
    expect(issue.facts.picks?.nonVoters).toHaveLength(13);
  });
});

describe("publishIssue", () => {
  it("flips a draft to published once and is idempotent", async () => {
    const store = new MemoryStore();
    await generateIssue({ snapshot, store, writer: new StubWriter(), gifs: null, research: null, picks: null });
    const first = await publishIssue(2026, 4, store);
    const second = await publishIssue(2026, 4, store);
    expect(first?.status).toBe("published");
    expect(first?.publishedAt).toBeTruthy();
    expect(second?.publishedAt).toBe(first?.publishedAt);
    expect(await publishIssue(2026, 9, store)).toBeNull();
  });
});
