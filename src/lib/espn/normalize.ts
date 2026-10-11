import type {
  Game,
  LeagueSnapshot,
  Matchup,
  PlayerLine,
  SlotCounts,
  Team,
  TeamWeek,
  Transaction,
  TransactionItem,
} from "@/lib/model";
import { injuryStatus, POSITION_BY_ID, PRO_TEAM_BY_ID, SLOT_BY_ID } from "./constants";
import {
  ACTIVITY_TYPES,
  type EspnActivityTopic,
  type EspnLeague,
  type EspnMatchupSide,
  type EspnPlayer,
  type EspnRosterEntry,
  type EspnScheduleItem,
  type EspnTeam,
} from "./client";

export function teamName(t: EspnTeam): string {
  return (t.name ?? `${t.location ?? ""} ${t.nickname ?? ""}`).trim();
}

export function normalizeTeams(teams: EspnTeam[]): Team[] {
  return teams.map((t) => ({
    id: String(t.id),
    name: teamName(t),
    abbrev: t.abbrev,
    wins: t.record.overall.wins,
    losses: t.record.overall.losses,
    ties: t.record.overall.ties,
    pointsFor: t.record.overall.pointsFor,
    pointsAgainst: t.record.overall.pointsAgainst,
  }));
}

export function normalizeGames(schedule: EspnScheduleItem[]): Game[] {
  return schedule
    .filter((s) => s.away)
    .map((s) => ({
      week: s.matchupPeriodId,
      homeId: String(s.home.teamId),
      awayId: String(s.away!.teamId),
      homePoints: s.home.totalPoints,
      awayPoints: s.away!.totalPoints,
      final: s.winner !== "UNDECIDED",
    }));
}

export function latestCompletedWeek(schedule: EspnScheduleItem[]): number {
  const weeks = new Map<number, boolean>();
  for (const s of schedule) {
    if (!s.away) continue;
    weeks.set(s.matchupPeriodId, (weeks.get(s.matchupPeriodId) ?? true) && s.winner !== "UNDECIDED");
  }
  return [...weeks].filter(([, done]) => done).reduce((max, [w]) => Math.max(max, w), 0);
}

function projectedFor(player: EspnPlayer, week: number): number {
  const stat = player.stats?.find((s) => s.scoringPeriodId === week && s.statSourceId === 1);
  return stat?.appliedTotal ?? 0;
}

function normalizeEntry(e: EspnRosterEntry, week: number): PlayerLine | null {
  const player = e.playerPoolEntry?.player;
  if (!player) return null;
  const position = POSITION_BY_ID[player.defaultPositionId];
  const slot = SLOT_BY_ID[e.lineupSlotId];
  if (!position || !slot) return null;
  return {
    playerId: String(player.id),
    name: player.fullName,
    position,
    proTeam: PRO_TEAM_BY_ID[player.proTeamId] ?? "FA",
    slot,
    points: e.playerPoolEntry?.appliedStatTotal ?? 0,
    projected: projectedFor(player, week),
    injury: injuryStatus(player.injuryStatus),
  };
}

function normalizeSide(side: EspnMatchupSide, week: number): TeamWeek {
  const entries = side.rosterForCurrentScoringPeriod?.entries ?? [];
  return {
    teamId: String(side.teamId),
    points: side.totalPoints,
    lineup: entries.map((e) => normalizeEntry(e, week)).filter((p): p is PlayerLine => p !== null),
  };
}

export function normalizeMatchups(schedule: EspnScheduleItem[], week: number): Matchup[] {
  return schedule
    .filter((s) => s.matchupPeriodId === week && s.away)
    .map((s) => ({
      week,
      home: normalizeSide(s.home, week),
      away: normalizeSide(s.away!, week),
    }));
}

export function normalizeSlots(lineupSlotCounts: Record<string, number>): SlotCounts {
  const out: SlotCounts = {};
  for (const [id, count] of Object.entries(lineupSlotCounts)) {
    const slot = SLOT_BY_ID[Number(id)];
    if (!slot || slot === "BE" || slot === "IR" || count <= 0) continue;
    out[slot] = count;
  }
  return out;
}

export type PlayerLookup = Map<number, EspnPlayer>;

// One activity topic is one transaction: a drop+add pair, a waiver claim,
// or every leg of a trade. Adds and drops carry the team in `to`; trade
// legs carry both `from` and `to`.
export function normalizeActivity(topics: EspnActivityTopic[], players: PlayerLookup): Transaction[] {
  const out: Transaction[] = [];
  for (const topic of topics) {
    const messages = topic.messages ?? [];
    const kinds = messages.map((m) => ACTIVITY_TYPES.get(m.messageTypeId)).filter(Boolean);
    if (kinds.length === 0) continue;
    const type: Transaction["type"] = kinds.includes("TRADE")
      ? "TRADE"
      : kinds.includes("WAIVER")
        ? "WAIVER"
        : kinds.includes("ADD")
          ? "ADD"
          : "DROP";
    const items = messages
      .map((m): TransactionItem | null => {
        const kind = ACTIVITY_TYPES.get(m.messageTypeId);
        const player = players.get(m.targetId);
        const position = player ? POSITION_BY_ID[player.defaultPositionId] : undefined;
        if (!kind || !player || !position) return null;
        const base = { playerId: String(m.targetId), playerName: player.fullName, position };
        if (kind === "TRADE") {
          return { ...base, action: "TRADE", fromTeamId: str(m.from), toTeamId: str(m.to) };
        }
        if (kind === "DROP") return { ...base, action: "DROP", fromTeamId: str(m.to) };
        return { ...base, action: "ADD", toTeamId: str(m.to) };
      })
      .filter((i): i is TransactionItem => i !== null);
    if (items.length === 0) continue;
    const teamId = items[0].toTeamId ?? items[0].fromTeamId ?? "";
    out.push({ id: topic.id, type, teamId, date: new Date(topic.date).toISOString(), items });
  }
  return out.sort((a, b) => b.date.localeCompare(a.date));
}

function str(n: number | undefined): string | undefined {
  return n === undefined ? undefined : String(n);
}

export function playerIdsIn(topics: EspnActivityTopic[]): number[] {
  return [...new Set(topics.flatMap((t) => (t.messages ?? []).map((m) => m.targetId)))];
}

export function assembleSnapshot(args: {
  overview: EspnLeague;
  box: EspnLeague;
  week: number;
  transactions: Transaction[];
  fetchedAt: Date;
}): LeagueSnapshot {
  const { overview, box, week, transactions, fetchedAt } = args;
  return {
    season: overview.seasonId,
    week,
    leagueName: overview.settings.name,
    playoffTeams: overview.settings.scheduleSettings.playoffTeamCount,
    regularSeasonWeeks: overview.settings.scheduleSettings.matchupPeriodCount,
    slots: normalizeSlots(overview.settings.rosterSettings.lineupSlotCounts),
    teams: normalizeTeams(overview.teams),
    matchups: normalizeMatchups(box.schedule, week),
    games: normalizeGames(overview.schedule),
    transactions,
    fetchedAt: fetchedAt.toISOString(),
  };
}
