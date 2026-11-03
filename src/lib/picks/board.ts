import type { Game } from "@/lib/model";
import type { PickSheet } from "./store";

export function gameKey(g: { homeId: string; awayId: string }): string {
  return `${g.homeId}-${g.awayId}`;
}

// null while the game is unfinished or tied.
export function winnerOf(g: Game): string | null {
  if (!g.final || g.homePoints === g.awayPoints) return null;
  return g.homePoints > g.awayPoints ? g.homeId : g.awayId;
}

export type PickResult = "correct" | "wrong" | "push" | "pending";

export interface GradedPick {
  key: string;
  pick: string;
  result: PickResult;
}

export function gradeSheet(sheet: PickSheet, games: Game[]): GradedPick[] {
  const byKey = new Map(games.filter((g) => g.week === sheet.week).map((g) => [gameKey(g), g]));
  return Object.entries(sheet.picks).map(([key, pick]) => {
    const game = byKey.get(key);
    if (!game) return { key, pick, result: "pending" };
    if (!game.final) return { key, pick, result: "pending" };
    const winner = winnerOf(game);
    if (winner === null) return { key, pick, result: "push" };
    return { key, pick, result: winner === pick ? "correct" : "wrong" };
  });
}

export interface VoterRecord {
  teamId: string;
  owner: string;
  correct: number;
  wrong: number;
  pending: number;
}

function tally(grades: GradedPick[]): Pick<VoterRecord, "correct" | "wrong" | "pending"> {
  return {
    correct: grades.filter((g) => g.result === "correct").length,
    wrong: grades.filter((g) => g.result === "wrong").length,
    pending: grades.filter((g) => g.result === "pending").length,
  };
}

function byRecord(a: VoterRecord, b: VoterRecord): number {
  return b.correct - a.correct || a.wrong - b.wrong || a.owner.localeCompare(b.owner);
}

export function weekRecords(sheets: PickSheet[], games: Game[]): VoterRecord[] {
  return sheets
    .map((s) => ({ teamId: s.teamId, owner: s.owner, ...tally(gradeSheet(s, games)) }))
    .sort(byRecord);
}

export interface SeasonRow extends VoterRecord {
  weeks: Record<number, { correct: number; wrong: number }>;
  pct: number;
  // Positive: consecutive correct picks, newest first. Negative: consecutive wrong.
  streak: number;
}

export function seasonBoard(sheets: PickSheet[], games: Game[]): SeasonRow[] {
  const rows = new Map<string, SeasonRow>();
  const ordered = [...sheets].sort((a, b) => a.week - b.week);
  for (const s of ordered) {
    const grades = gradeSheet(s, games);
    const t = tally(grades);
    const row = rows.get(s.teamId) ?? {
      teamId: s.teamId,
      owner: s.owner,
      correct: 0,
      wrong: 0,
      pending: 0,
      weeks: {},
      pct: 0,
      streak: 0,
    };
    row.correct += t.correct;
    row.wrong += t.wrong;
    row.pending += t.pending;
    row.weeks[s.week] = { correct: t.correct, wrong: t.wrong };
    for (const g of grades) {
      if (g.result === "correct") row.streak = row.streak > 0 ? row.streak + 1 : 1;
      else if (g.result === "wrong") row.streak = row.streak < 0 ? row.streak - 1 : -1;
    }
    rows.set(s.teamId, row);
  }
  return [...rows.values()]
    .map((r) => ({ ...r, pct: r.correct + r.wrong > 0 ? Math.round((100 * r.correct) / (r.correct + r.wrong)) : 0 }))
    .sort(byRecord);
}

export interface MatchupVotes {
  game: Game;
  key: string;
  home: string[];
  away: string[];
}

export function votesByGame(sheets: PickSheet[], games: Game[]): MatchupVotes[] {
  return games.map((game) => {
    const key = gameKey(game);
    const home: string[] = [];
    const away: string[] = [];
    for (const s of sheets) {
      if (s.picks[key] === game.homeId) home.push(s.owner);
      else if (s.picks[key] === game.awayId) away.push(s.owner);
    }
    return { game, key, home, away };
  });
}

export interface PickFacts {
  week: number;
  voters: number;
  nonVoters: string[];
  records: { owner: string; correct: number; wrong: number }[];
  perfect: string[];
  winless: string[];
  // Voters who picked their own opponent; won says whether their team won anyway.
  againstSelf: { owner: string; won: boolean }[];
  // Finished games where most voters picked the loser.
  upsets: { winner: string; loser: string; pickedWinner: number; pickedLoser: number }[];
  season: { owner: string; correct: number; wrong: number; pct: number; streak: number }[];
}

export function pickFacts(
  sheets: PickSheet[],
  games: Game[],
  week: number,
  ownerOf: (teamId: string) => string,
  allTeamIds: string[],
): PickFacts | null {
  const weekSheets = sheets.filter((s) => s.week === week);
  if (weekSheets.length === 0) return null;
  const weekGames = games.filter((g) => g.week === week);
  const records = weekRecords(weekSheets, games);
  const voted = new Set(weekSheets.map((s) => s.teamId));

  const againstSelf = weekSheets.flatMap((s) => {
    const own = weekGames.find((g) => g.homeId === s.teamId || g.awayId === s.teamId);
    if (!own) return [];
    const opponent = own.homeId === s.teamId ? own.awayId : own.homeId;
    if (s.picks[gameKey(own)] !== opponent) return [];
    return [{ owner: s.owner, won: winnerOf(own) === s.teamId }];
  });

  const upsets = votesByGame(weekSheets, weekGames).flatMap((v) => {
    const winner = winnerOf(v.game);
    if (winner === null) return [];
    const pickedWinner = winner === v.game.homeId ? v.home.length : v.away.length;
    const pickedLoser = winner === v.game.homeId ? v.away.length : v.home.length;
    if (pickedLoser <= pickedWinner) return [];
    const loser = winner === v.game.homeId ? v.game.awayId : v.game.homeId;
    return [{ winner: ownerOf(winner), loser: ownerOf(loser), pickedWinner, pickedLoser }];
  });

  const decided = (r: VoterRecord) => r.correct + r.wrong > 0 && r.pending === 0;
  return {
    week,
    voters: weekSheets.length,
    nonVoters: allTeamIds.filter((id) => !voted.has(id)).map(ownerOf).sort(),
    records: records.map(({ owner, correct, wrong }) => ({ owner, correct, wrong })),
    perfect: records.filter((r) => decided(r) && r.wrong === 0).map((r) => r.owner),
    winless: records.filter((r) => decided(r) && r.correct === 0).map((r) => r.owner),
    againstSelf,
    upsets,
    season: seasonBoard(sheets, games).map(({ owner, correct, wrong, pct, streak }) => ({ owner, correct, wrong, pct, streak })),
  };
}
