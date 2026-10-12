import type { LeagueSnapshot, PlayerLine, Team } from "@/lib/model";
import { league, ownerName } from "@/config/league";
import { lineupFacts, type LineupFacts } from "./lineup";
import { matchupResults, superlatives, type MatchupResult, type SideResult } from "./matchups";
import {
  luckiestWin,
  seasonLuck,
  sortStandings,
  streaks,
  unluckiestLoss,
  weekLuck,
  type SeasonLuck,
  type WeekLuck,
} from "./luck";
import { transactionFacts, type TransactionFacts } from "./transactions";
import { simulatePlayoffs, type PlayoffSim } from "./playoffs";

export interface TeamRef {
  teamId: string;
  teamName: string;
  owner: string;
}

export interface TeamFacts extends TeamRef {
  record: string;
  pointsFor: number;
  pointsAgainst: number;
  streak: string;
  standingsRank: number;
  pointsForRank: number;
}

export interface ResultFacts {
  winner: SideResult & TeamRef;
  loser: SideResult & TeamRef;
  margin: number;
  tie: boolean;
}

export interface InjuryFact extends TeamRef {
  player: string;
  position: string;
  status: string;
  wasStarterLastWeek: boolean;
}

export interface Facts {
  season: number;
  week: number;
  leagueName: string;
  newsletter: { name: string; tagline: string };
  generatedAt: string;
  teams: TeamFacts[];
  results: ResultFacts[];
  superlatives: {
    closest: ResultFacts | null;
    blowout: ResultFacts | null;
    highScore: (SideResult & TeamRef) | null;
    lowScore: (SideResult & TeamRef) | null;
    topPlayer: (TeamRef & { player: PlayerLine }) | null;
  };
  lineups: (LineupFacts & TeamRef & { opponentPoints: number; wouldHaveWon: boolean })[];
  luck: {
    week: (WeekLuck & TeamRef)[];
    unluckiestLoss: (WeekLuck & TeamRef) | null;
    luckiestWin: (WeekLuck & TeamRef) | null;
    season: (SeasonLuck & TeamRef)[];
  };
  playoffs: Omit<PlayoffSim, "odds"> & {
    odds: (PlayoffSim["odds"][number] & TeamRef & { seed: number })[];
  };
  transactions: Omit<
    TransactionFacts,
    "byTeam" | "churnKing" | "dropReadds" | "trades" | "quietTeams"
  > & {
    byTeam: (TransactionFacts["byTeam"][number] & TeamRef)[];
    churnKing: (TransactionFacts["byTeam"][number] & TeamRef) | null;
    dropReadds: (TransactionFacts["dropReadds"][number] &
      TeamRef & { droppedOn: string; readdedOn: string })[];
    trades: {
      id: string;
      date: string;
      on: string;
      sides: (TeamRef & { received: string[] })[];
    }[];
    quietTeams: TeamRef[];
  };
  injuries: InjuryFact[];
  chugList: (TeamRef & { player: string; position: string; slot: string })[];
  nextWeek: { week: number; home: TeamFacts; away: TeamFacts }[];
}

const TRANSACTION_WINDOW_DAYS = 7;

const dayLabel = new Intl.DateTimeFormat("en-US", {
  weekday: "short",
  month: "short",
  day: "numeric",
  timeZone: "America/Denver",
});

// Writers turn raw ISO timestamps into the wrong weekday; hand them the label.
export function whenLabel(iso: string): string {
  return dayLabel.format(new Date(iso));
}

export function buildFacts(snapshot: LeagueSnapshot, now = new Date()): Facts {
  const byId = new Map(snapshot.teams.map((t) => [t.id, t]));
  const ref = (teamId: string): TeamRef => {
    const t = byId.get(teamId);
    const teamName = t?.name.trim() ?? `Team ${teamId}`;
    return { teamId, teamName, owner: ownerName(teamId, teamName) };
  };

  const standings = sortStandings(snapshot.teams);
  const streakByTeam = streaks(snapshot.games, snapshot.teams.map((t) => t.id));
  const season = seasonLuck(snapshot.teams);
  const teamFacts = (t: Team): TeamFacts => {
    const sl = season.find((s) => s.teamId === t.id)!;
    return {
      ...ref(t.id),
      record: sl.record,
      pointsFor: t.pointsFor,
      pointsAgainst: t.pointsAgainst,
      streak: streakByTeam[t.id],
      standingsRank: sl.standingsRank,
      pointsForRank: sl.pointsForRank,
    };
  };
  const teams = standings.map(teamFacts);
  const teamFactsById = new Map(teams.map((t) => [t.teamId, t]));

  const rawResults = matchupResults(snapshot.matchups);
  const decorateResult = (r: MatchupResult): ResultFacts => ({
    winner: { ...r.winner, ...ref(r.winner.teamId) },
    loser: { ...r.loser, ...ref(r.loser.teamId) },
    margin: r.margin,
    tie: r.tie,
  });
  const results = rawResults.map(decorateResult);
  const sup = superlatives(rawResults);

  const opponentPoints = new Map<string, number>();
  for (const m of snapshot.matchups) {
    opponentPoints.set(m.home.teamId, m.away.points);
    opponentPoints.set(m.away.teamId, m.home.points);
  }
  const lineups = snapshot.matchups
    .flatMap((m) => [m.home, m.away])
    .map((tw) => {
      const lf = lineupFacts(tw, snapshot.slots);
      const opp = opponentPoints.get(tw.teamId) ?? 0;
      return {
        ...lf,
        ...ref(tw.teamId),
        opponentPoints: opp,
        wouldHaveWon: tw.points < opp && lf.optimal > opp,
      };
    })
    .sort((a, b) => b.pointsLeft - a.pointsLeft);

  const wl = weekLuck(rawResults);
  const ul = unluckiestLoss(wl);
  const lw = luckiestWin(wl);

  const sim = simulatePlayoffs(snapshot.teams, snapshot.games, snapshot.playoffTeams);
  const seedOf = (teamId: string) => standings.findIndex((t) => t.id === teamId) + 1;

  const tx = transactionFacts(
    snapshot.transactions,
    snapshot.teams.map((t) => t.id),
    TRANSACTION_WINDOW_DAYS,
    now,
  );

  // Injury status is ESPN's current flag, so it describes next week's risk,
  // not what happened in the week being recapped.
  const injuries: InjuryFact[] = snapshot.matchups
    .flatMap((m) => [m.home, m.away])
    .flatMap((tw) =>
      tw.lineup
        .filter((p) => {
          const wasStarter = p.slot !== "BE" && p.slot !== "IR";
          if (p.injury === "QUESTIONABLE") return wasStarter;
          return p.injury !== "ACTIVE" && p.injury !== "UNKNOWN" && p.slot !== "IR";
        })
        .map((p) => ({
          ...ref(tw.teamId),
          player: p.name,
          position: p.position,
          status: p.injury,
          wasStarterLastWeek: p.slot !== "BE" && p.slot !== "IR",
        })),
    );

  const nextWeek = snapshot.games
    .filter((g) => g.week === snapshot.week + 1)
    .map((g) => ({
      week: g.week,
      home: teamFactsById.get(g.homeId)!,
      away: teamFactsById.get(g.awayId)!,
    }))
    .filter((g) => g.home && g.away);

  return {
    season: snapshot.season,
    week: snapshot.week,
    leagueName: snapshot.leagueName,
    newsletter: league.newsletter,
    generatedAt: now.toISOString(),
    teams,
    results,
    superlatives: {
      closest: sup.closest ? decorateResult(sup.closest) : null,
      blowout: sup.blowout ? decorateResult(sup.blowout) : null,
      highScore: sup.highScore ? { ...sup.highScore, ...ref(sup.highScore.teamId) } : null,
      lowScore: sup.lowScore ? { ...sup.lowScore, ...ref(sup.lowScore.teamId) } : null,
      topPlayer: sup.topPlayer ? { ...ref(sup.topPlayer.teamId), player: sup.topPlayer.player } : null,
    },
    lineups,
    luck: {
      week: wl.map((l) => ({ ...l, ...ref(l.teamId) })),
      unluckiestLoss: ul ? { ...ul, ...ref(ul.teamId) } : null,
      luckiestWin: lw ? { ...lw, ...ref(lw.teamId) } : null,
      season: season.map((s) => ({ ...s, ...ref(s.teamId) })),
    },
    playoffs: {
      ...sim,
      odds: sim.odds.map((o) => ({ ...o, ...ref(o.teamId), seed: seedOf(o.teamId) })),
    },
    transactions: {
      ...tx,
      byTeam: tx.byTeam.map((t) => ({ ...t, ...ref(t.teamId) })),
      churnKing: tx.churnKing ? { ...tx.churnKing, ...ref(tx.churnKing.teamId) } : null,
      dropReadds: tx.dropReadds.map((d) => ({
        ...d,
        ...ref(d.teamId),
        droppedOn: whenLabel(d.droppedAt),
        readdedOn: whenLabel(d.readdedAt),
      })),
      trades: tx.trades.map((t) => ({
        ...t,
        on: whenLabel(t.date),
        sides: t.sides.map((s) => ({ ...ref(s.teamId), received: s.received })),
      })),
      quietTeams: tx.quietTeams.map(ref),
    },
    injuries,
    chugList: lineups.flatMap((l) =>
      l.zeroStarters.map((p) => ({
        ...ref(l.teamId),
        player: p.name,
        position: p.position,
        slot: p.slot,
      })),
    ),
    nextWeek,
  };
}
