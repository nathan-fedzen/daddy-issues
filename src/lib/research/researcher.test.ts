import { describe, expect, it } from "vitest";
import { parseNotes } from "./researcher";

describe("parseNotes", () => {
  it("reads the tagged JSON array and drops malformed entries", () => {
    const text = `I searched around.\n<notes>[{"player":"Lamar Jackson","owner":"Tanner","what":"Left on the first drive.","source":"https://x.test/a"},{"player":"Nobody"},{"player":"Emanuel Wilson","owner":"Tanner","what":"Healthy scratch.","source":null}]</notes>`;
    expect(parseNotes(text)).toEqual([
      { player: "Lamar Jackson", owner: "Tanner", what: "Left on the first drive.", source: "https://x.test/a" },
      { player: "Emanuel Wilson", owner: "Tanner", what: "Healthy scratch." },
    ]);
  });

  it("falls back to a fenced block or a bare array", () => {
    expect(parseNotes('```json\n[{"player":"A","owner":"B","what":"C"}]\n```')).toEqual([
      { player: "A", owner: "B", what: "C" },
    ]);
    expect(parseNotes('[{"player":"A","owner":"B","what":"C"}]')).toEqual([{ player: "A", owner: "B", what: "C" }]);
  });

  it("returns nothing for prose or broken JSON", () => {
    expect(parseNotes("No notes today.")).toEqual([]);
    expect(parseNotes("<notes>[{broken</notes>")).toEqual([]);
    expect(parseNotes('<notes>{"player":"A"}</notes>')).toEqual([]);
  });
});
