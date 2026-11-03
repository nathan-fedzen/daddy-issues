import { describe, expect, it } from "vitest";
import { denver, lockLabel, pickWindow, pickWindowFor, type PickSchedule } from "./time";

const schedule: PickSchedule = { weekOneThursday: "2026-09-10", firstWeek: 9, lastWeek: 18, lockHour: 18 };

describe("denver", () => {
  it("converts Denver wall clock to an instant on both sides of the DST change", () => {
    expect(denver(2026, 10, 29, 18).toISOString()).toBe("2026-10-30T00:00:00.000Z");
    expect(denver(2026, 11, 5, 18).toISOString()).toBe("2026-11-06T01:00:00.000Z");
  });
});

describe("pickWindowFor", () => {
  it("runs Tuesday to Tuesday and locks Thursday evening", () => {
    const w = pickWindowFor(9, schedule);
    expect(w.opensAt.toISOString()).toBe("2026-11-03T07:00:00.000Z");
    expect(w.lockAt.toISOString()).toBe("2026-11-06T01:00:00.000Z");
    expect(w.closesAt.toISOString()).toBe("2026-11-10T07:00:00.000Z");
    expect(lockLabel(w.lockAt)).toBe("Thursday 6:00 PM");
  });

  it("keeps the Thursday lock at 6pm on the daylight-time side of the season too", () => {
    const w = pickWindowFor(8, schedule);
    expect(w.opensAt.toISOString()).toBe("2026-10-27T06:00:00.000Z");
    expect(w.lockAt.toISOString()).toBe("2026-10-30T00:00:00.000Z");
    expect(w.closesAt.toISOString()).toBe("2026-11-03T07:00:00.000Z");
  });
});

describe("pickWindow", () => {
  it("is open from Tuesday until the Thursday lock, then shows scores until the next Tuesday", () => {
    expect(pickWindow(new Date("2026-11-03T20:00:00Z"), schedule)).toMatchObject({ week: 9, open: true });
    expect(pickWindow(new Date("2026-11-06T00:59:00Z"), schedule)).toMatchObject({ week: 9, open: true });
    expect(pickWindow(new Date("2026-11-06T01:00:00Z"), schedule)).toMatchObject({ week: 9, open: false });
    expect(pickWindow(new Date("2026-11-09T04:00:00Z"), schedule)).toMatchObject({ week: 9, open: false });
    expect(pickWindow(new Date("2026-11-10T07:00:00Z"), schedule)).toMatchObject({ week: 10, open: true });
  });

  it("flips weeks at Denver midnight on Tuesday, across the DST change", () => {
    expect(pickWindow(new Date("2026-11-03T06:59:00Z"), schedule)).toMatchObject({ week: 8, open: false });
    expect(pickWindow(new Date("2026-11-03T07:00:00Z"), schedule)).toMatchObject({ week: 9, open: true });
  });

  it("clamps to the season", () => {
    expect(pickWindow(new Date("2026-08-01T00:00:00Z"), schedule).week).toBe(1);
    expect(pickWindow(new Date("2027-03-01T00:00:00Z"), schedule).week).toBe(18);
  });
});
