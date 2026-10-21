import Link from "next/link";
import { league } from "@/config/league";
import { robotOf, type Facts } from "@/lib/facts";

export function RobotCard({ facts }: { facts: Facts }) {
  const cfg = league.robot;
  if (!cfg) return null;
  const r = robotOf(facts).find((x) => x.teamId === cfg.teamId);
  if (!r) return null;
  const robotAhead = r.diff > 0;
  const headline = robotAhead
    ? `${cfg.name} beats ${r.owner} by ${r.diff.toFixed(2)}`
    : r.diff < 0
      ? `${r.owner} beats ${cfg.name} by ${Math.abs(r.diff).toFixed(2)}`
      : `${r.owner} and ${cfg.name} tied`;
  const verdict =
    !r.actualWon && r.robotWon
      ? `The robot wins this matchup. ${r.owner} didn't.`
      : r.actualWon && !r.robotWon
        ? `${r.owner} wins this matchup. The robot wouldn't have.`
        : r.actualWon
          ? "Both win. Nothing settled."
          : "Both lose. Nothing settled.";
  const benched = r.starters.filter((s) => !s.wasStarter);

  return (
    <section aria-label={`${cfg.name} versus ${r.owner}`} className="mt-10">
      <h2 className="section-head">Robot vs {r.owner}, week {facts.week}</h2>
      <p className="max-w-[36rem]">
        {cfg.name} starts strictly by ESPN projection, no feelings. Same roster, same week.
      </p>
      <div className="mt-4 grid grid-cols-2 gap-4 border-y-2 border-ink py-3">
        <Score who={r.owner} points={r.actual} won={r.actualWon} lead={!robotAhead && r.diff !== 0} />
        <Score who={cfg.name} points={r.robot} won={r.robotWon} lead={robotAhead} right />
      </div>
      <p className="mt-3 font-semibold">{headline}.</p>
      <p className="text-sm text-steel">
        Opponent scored {r.opponentPoints.toFixed(2)}. {verdict}
      </p>
      {benched.length > 0 && (
        <p className="mt-3 text-sm">
          The robot would have started{" "}
          {benched.map((s, i) => (
            <span key={s.name}>
              {i > 0 && (i === benched.length - 1 ? " and " : ", ")}
              <span className="font-semibold">{s.name}</span> ({s.points.toFixed(1)})
            </span>
          ))}
          . {r.owner} benched {benched.length === 1 ? "him" : "them"}.
        </p>
      )}
      <Link href="/season#robot" className="mt-3 inline-block font-semibold text-orange underline underline-offset-4">
        Season tally
      </Link>
    </section>
  );
}

function Score({ who, points, won, lead, right }: { who: string; points: number; won: boolean; lead: boolean; right?: boolean }) {
  return (
    <div className={right ? "text-right" : "border-l-4 border-orange pl-2"}>
      <p className="font-display text-xl font-bold leading-tight">{who}</p>
      <p className={`font-display text-5xl font-black leading-none nums ${lead ? "" : "text-steel"}`}>
        {points.toFixed(2)}
      </p>
      <p className="text-xs font-medium text-steel">{won ? "wins the week" : "loses the week"}</p>
    </div>
  );
}
