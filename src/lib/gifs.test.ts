import { describe, expect, it, vi } from "vitest";
import { gifCues, queryLadder, resolveGifs } from "./gifs";

const md = `## DJ lost

DJ lost. That's the recap.

{{gif: slow clap}}

## Rudy, again

Seven moves.
{{gif: confused math lady}}

{{ gif: crying at desk }}
{{gif: fourth cue}}
Done.`;

describe("gifCues", () => {
  it("finds every cue line", () => {
    expect(gifCues(md)).toEqual(["slow clap", "confused math lady", "crying at desk", "fourth cue"]);
  });
});

describe("queryLadder", () => {
  it("shortens a specific phrase step by step", () => {
    expect(queryLadder("guy throwing hands up defeated")).toEqual([
      "guy throwing hands up defeated",
      "throwing hands defeated",
      "throwing hands",
      "throwing",
    ]);
    expect(queryLadder("slow clap")).toEqual(["slow clap", "slow"]);
  });
});

describe("resolveGifs", () => {
  it("walks the query ladder until a search returns hits", async () => {
    const search = vi.fn(async (q: string) =>
      q === "fireworks" ? [{ url: "https://g/fw.gif", title: "fireworks" }] : [],
    );
    const out = await resolveGifs("Boom.\n\n{{gif: fireworks over the city}}\n\nNext.", "s", search);
    expect(out).toContain("![fireworks](https://g/fw.gif)");
    expect(search.mock.calls.map((c) => c[0])).toEqual(["fireworks over the city", "fireworks city", "fireworks"]);
  });

  it("replaces cues with images, caps at three, and is stable for a seed", async () => {
    const search = vi.fn(async (phrase: string) => [
      { url: `https://g/${phrase.replace(/ /g, "-")}/a.gif`, title: `${phrase} a` },
      { url: `https://g/${phrase.replace(/ /g, "-")}/b.gif`, title: `${phrase} b` },
    ]);
    const first = await resolveGifs(md, "2026-4", search);
    const second = await resolveGifs(md, "2026-4", search);
    expect(first).toBe(second);
    expect(first.match(/!\[/g)).toHaveLength(3);
    expect(first).not.toContain("{{");
    expect(first).toContain("https://g/slow-clap/");
    // three cues resolved per run, the fourth never searched; two runs
    expect(search).toHaveBeenCalledTimes(6);
  });

  it("drops cues cleanly when there is no search backend", async () => {
    const out = await resolveGifs(md, "x", null);
    expect(out).not.toContain("{{");
    expect(out).not.toContain("\n\n\n");
    expect(out).toContain("Seven moves.\n\nDone.");
  });

  it("drops a cue whose lookup fails and keeps going", async () => {
    const search = vi.fn(async (phrase: string) => {
      if (phrase === "slow clap") throw new Error("boom");
      return [{ url: "https://g/x.gif", title: "x" }];
    });
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const out = await resolveGifs(md, "x", search);
    expect(out.match(/!\[/g)).toHaveLength(3);
    expect(out).not.toContain("{{");
    warn.mockRestore();
  });
});
