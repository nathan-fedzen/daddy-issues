import type { Transaction } from "@/lib/model";

export interface TeamChurn {
  teamId: string;
  moves: number;
  adds: number;
  drops: number;
  dstSwaps: number;
}

export interface DropReadd {
  teamId: string;
  playerName: string;
  droppedAt: string;
  readdedAt: string;
}

export interface TradeSummary {
  id: string;
  date: string;
  sides: { teamId: string; received: string[] }[];
}

export interface TransactionFacts {
  windowDays: number;
  total: number;
  byTeam: TeamChurn[];
  churnKing: TeamChurn | null;
  dropReadds: DropReadd[];
  trades: TradeSummary[];
  quietTeams: string[];
}

export function transactionFacts(
  transactions: Transaction[],
  teamIds: string[],
  windowDays: number,
  now: Date,
): TransactionFacts {
  const since = now.getTime() - windowDays * 86_400_000;
  const recent = transactions.filter((t) => new Date(t.date).getTime() >= since);
  const byTeam: TeamChurn[] = teamIds.map((teamId) => {
    const mine = recent.filter((t) => t.teamId === teamId && t.type !== "TRADE");
    const items = mine.flatMap((t) => t.items);
    return {
      teamId,
      moves: mine.length,
      adds: items.filter((i) => i.action === "ADD").length,
      drops: items.filter((i) => i.action === "DROP").length,
      dstSwaps: items.filter((i) => i.action === "ADD" && i.position === "D/ST").length,
    };
  });
  const active = byTeam.filter((t) => t.moves > 0).sort((a, b) => b.moves - a.moves);
  return {
    windowDays,
    total: recent.length,
    byTeam: active,
    churnKing: active[0] ?? null,
    dropReadds: dropReadds(recent),
    trades: trades(recent),
    quietTeams: byTeam.filter((t) => t.moves === 0).map((t) => t.teamId),
  };
}

function dropReadds(transactions: Transaction[]): DropReadd[] {
  const out: DropReadd[] = [];
  const sorted = [...transactions].sort((a, b) => a.date.localeCompare(b.date));
  for (const drop of sorted) {
    for (const item of drop.items) {
      if (item.action !== "DROP") continue;
      const readd = sorted.find(
        (t) =>
          t.teamId === drop.teamId &&
          t.date > drop.date &&
          t.items.some((i) => i.action === "ADD" && i.playerId === item.playerId),
      );
      if (readd) {
        out.push({
          teamId: drop.teamId,
          playerName: item.playerName,
          droppedAt: drop.date,
          readdedAt: readd.date,
        });
      }
    }
  }
  return out;
}

function trades(transactions: Transaction[]): TradeSummary[] {
  return transactions
    .filter((t) => t.type === "TRADE")
    .map((t) => {
      const sides = new Map<string, string[]>();
      for (const item of t.items) {
        if (!item.toTeamId) continue;
        sides.set(item.toTeamId, [...(sides.get(item.toTeamId) ?? []), item.playerName]);
      }
      return {
        id: t.id,
        date: t.date,
        sides: [...sides].map(([teamId, received]) => ({ teamId, received })),
      };
    });
}
