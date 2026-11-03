import type { BoxLine, Position } from "@/lib/model";
import { STAT } from "./constants";

type Stats = Record<string, number> | undefined;

const n = (stats: Stats, id: number): number => Math.round(stats?.[String(id)] ?? 0);

// ESPN records a games-played stat for anyone who took the field, so a 0.0
// with it set means he played and did nothing (or got hurt), not a scratch.
export function boxLine(position: Position, stats: Stats): BoxLine {
  if (!stats || n(stats, STAT.gamesPlayed) < 1) return { played: false, line: "did not play" };
  return { played: true, line: describe(position, stats) };
}

function describe(position: Position, stats: Stats): string {
  switch (position) {
    case "QB":
      return quarterback(stats);
    case "K":
      return `${n(stats, STAT.fgMade)}/${n(stats, STAT.fgAtt)} FG, ${n(stats, STAT.xpMade)}/${n(stats, STAT.xpAtt)} XP`;
    case "D/ST":
      return [
        `${n(stats, STAT.sacks)} sacks`,
        `${n(stats, STAT.defInt) + n(stats, STAT.defFumRec)} takeaways`,
        `${n(stats, STAT.pointsAllowed)} pts allowed`,
        `${n(stats, STAT.yardsAllowed)} yds allowed`,
      ].join(", ");
    default:
      return skillPlayer(stats);
  }
}

function quarterback(stats: Stats): string {
  if (n(stats, STAT.passAtt) === 0 && n(stats, STAT.rushAtt) === 0) return "played, no attempts";
  const parts = [
    `${n(stats, STAT.passComp)}/${n(stats, STAT.passAtt)}, ${n(stats, STAT.passYds)} yds, ${n(stats, STAT.passTd)} TD, ${n(stats, STAT.passInt)} INT`,
  ];
  if (n(stats, STAT.rushAtt) > 0) parts.push(rushing(stats));
  return withFumbles(parts, stats);
}

function skillPlayer(stats: Stats): string {
  const parts: string[] = [];
  if (n(stats, STAT.rushAtt) > 0) parts.push(rushing(stats));
  if (n(stats, STAT.targets) > 0) parts.push(receiving(stats));
  if (parts.length === 0) parts.push("played, no touches");
  return withFumbles(parts, stats);
}

function rushing(stats: Stats): string {
  const td = n(stats, STAT.rushTd);
  return `${n(stats, STAT.rushAtt)} car, ${n(stats, STAT.rushYds)} yds${td ? `, ${td} TD` : ""}`;
}

function receiving(stats: Stats): string {
  const td = n(stats, STAT.recTd);
  return `${n(stats, STAT.rec)}/${n(stats, STAT.targets)} tgt, ${n(stats, STAT.recYds)} yds${td ? `, ${td} TD` : ""}`;
}

function withFumbles(parts: string[], stats: Stats): string {
  const lost = n(stats, STAT.fumblesLost);
  if (lost > 0) parts.push(`${lost} fumble${lost > 1 ? "s" : ""} lost`);
  return parts.join("; ");
}
