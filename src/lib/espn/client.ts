export interface EspnCredentials {
  espnS2: string;
  swid: string;
}

export interface EspnStat {
  scoringPeriodId: number;
  statSourceId: number;
  appliedTotal?: number;
}

export interface EspnPlayer {
  id: number;
  fullName: string;
  defaultPositionId: number;
  proTeamId: number;
  injuryStatus?: string;
  stats?: EspnStat[];
}

export interface EspnRosterEntry {
  playerId: number;
  lineupSlotId: number;
  playerPoolEntry?: { appliedStatTotal?: number; player: EspnPlayer };
}

export interface EspnMatchupSide {
  teamId: number;
  totalPoints: number;
  rosterForCurrentScoringPeriod?: { entries: EspnRosterEntry[] };
}

export interface EspnScheduleItem {
  id: number;
  matchupPeriodId: number;
  winner: "HOME" | "AWAY" | "UNDECIDED" | "TIE";
  home: EspnMatchupSide;
  away?: EspnMatchupSide;
}

export interface EspnTeam {
  id: number;
  name?: string;
  location?: string;
  nickname?: string;
  abbrev: string;
  record: { overall: { wins: number; losses: number; ties: number; pointsFor: number; pointsAgainst: number } };
}

export interface EspnActivityMessage {
  messageTypeId: number;
  targetId: number;
  from?: number;
  to?: number;
}

export interface EspnActivityTopic {
  id: string;
  date: number;
  messages?: EspnActivityMessage[];
}

export interface EspnLeague {
  id: number;
  seasonId: number;
  scoringPeriodId: number;
  status: { currentMatchupPeriod: number; latestScoringPeriod: number; finalScoringPeriod: number };
  settings: {
    name: string;
    scheduleSettings: { playoffTeamCount: number; matchupPeriodCount: number };
    rosterSettings: { lineupSlotCounts: Record<string, number> };
  };
  teams: EspnTeam[];
  schedule: EspnScheduleItem[];
}

export interface EspnPlayerInfo {
  id: number;
  player: EspnPlayer;
}

const BASE = "https://lm-api-reads.fantasy.espn.com/apis/v3/games/ffl";

export const ACTIVITY_TYPES = new Map<number, "ADD" | "WAIVER" | "DROP" | "TRADE">([
  [178, "ADD"],
  [180, "WAIVER"],
  [179, "DROP"],
  [181, "DROP"],
  [239, "DROP"],
  [244, "TRADE"],
]);

export class EspnClient {
  constructor(
    private readonly leagueId: string,
    private readonly season: number,
    private readonly credentials: EspnCredentials,
  ) {}

  private async get<T>(path: string, params: URLSearchParams, filter?: object): Promise<T> {
    const url = `${BASE}/seasons/${this.season}${path}?${params}`;
    const res = await fetch(url, {
      headers: {
        Accept: "application/json",
        Cookie: `espn_s2=${this.credentials.espnS2}; SWID=${this.credentials.swid}`,
        ...(filter ? { "X-Fantasy-Filter": JSON.stringify(filter) } : {}),
      },
      cache: "no-store",
    });
    if (!res.ok) {
      throw new Error(`ESPN ${res.status} for ${url}: ${(await res.text()).slice(0, 200)}`);
    }
    return (await res.json()) as T;
  }

  private leaguePath(): string {
    return `/segments/0/leagues/${this.leagueId}`;
  }

  async league(views: string[], scoringPeriodId?: number): Promise<EspnLeague> {
    const params = new URLSearchParams();
    for (const v of views) params.append("view", v);
    if (scoringPeriodId) params.set("scoringPeriodId", String(scoringPeriodId));
    return this.get<EspnLeague>(this.leaguePath(), params);
  }

  async overview(): Promise<EspnLeague> {
    return this.league(["mTeam", "mSettings", "mMatchupScore", "mStatus"]);
  }

  async boxScores(week: number): Promise<EspnLeague> {
    return this.league(["mMatchup", "mMatchupScore", "mScoreboard", "mBoxscore"], week);
  }

  // The activity feed is the only ESPN view that lists every leg of a trade;
  // mTransactions2 returns upheld trades with empty items.
  async activity(limit = 150): Promise<EspnActivityTopic[]> {
    const params = new URLSearchParams({ view: "kona_league_communication" });
    const data = await this.get<{ topics?: EspnActivityTopic[] }>(
      `${this.leaguePath()}/communication/`,
      params,
      {
        topics: {
          filterType: { value: ["ACTIVITY_TRANSACTIONS"] },
          limit,
          limitPerMessageSet: { value: 25 },
          includeMessageTypeIds: { value: [...ACTIVITY_TYPES.keys()] },
          sortMessageDate: { sortPriority: 1, sortAsc: false },
          sortFor: { sortPriority: 2, sortAsc: false },
        },
      },
    );
    return data.topics ?? [];
  }

  async players(ids: number[]): Promise<EspnPlayerInfo[]> {
    if (ids.length === 0) return [];
    const params = new URLSearchParams({ view: "kona_player_info" });
    const data = await this.get<{ players: EspnPlayerInfo[] }>(this.leaguePath(), params, {
      players: { filterIds: { value: ids } },
    });
    return data.players ?? [];
  }
}

export function credentialsFromEnv(): EspnCredentials {
  const espnS2 = process.env.ESPN_S2;
  const swid = process.env.ESPN_SWID;
  if (!espnS2 || !swid) {
    throw new Error("ESPN_S2 and ESPN_SWID must be set (private league cookies).");
  }
  return { espnS2, swid };
}
