export type Position = "QB" | "RB" | "WR" | "TE" | "K" | "D/ST";
export type Slot = Position | "FLEX" | "BE" | "IR";
export type InjuryStatus =
  | "ACTIVE"
  | "QUESTIONABLE"
  | "DOUBTFUL"
  | "OUT"
  | "IR"
  | "SUSPENDED"
  | "UNKNOWN";

export interface PlayerLine {
  playerId: string;
  name: string;
  position: Position;
  proTeam: string;
  slot: Slot;
  points: number;
  projected: number;
  injury: InjuryStatus;
}

export interface TeamWeek {
  teamId: string;
  points: number;
  lineup: PlayerLine[];
}

export interface Matchup {
  week: number;
  home: TeamWeek;
  away: TeamWeek;
}

export interface Game {
  week: number;
  homeId: string;
  awayId: string;
  homePoints: number;
  awayPoints: number;
  final: boolean;
}

export interface Team {
  id: string;
  name: string;
  abbrev: string;
  wins: number;
  losses: number;
  ties: number;
  pointsFor: number;
  pointsAgainst: number;
}

export type TransactionType = "ADD" | "DROP" | "WAIVER" | "TRADE";

export interface TransactionItem {
  action: "ADD" | "DROP" | "TRADE";
  playerId: string;
  playerName: string;
  position: Position;
  fromTeamId?: string;
  toTeamId?: string;
}

export interface Transaction {
  id: string;
  type: TransactionType;
  teamId: string;
  date: string;
  items: TransactionItem[];
}

export type SlotCounts = Partial<Record<Exclude<Slot, "BE" | "IR">, number>>;

export interface LeagueSnapshot {
  season: number;
  week: number;
  leagueName: string;
  playoffTeams: number;
  regularSeasonWeeks: number;
  slots: SlotCounts;
  teams: Team[];
  matchups: Matchup[];
  games: Game[];
  transactions: Transaction[];
  fetchedAt: string;
}
