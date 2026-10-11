import type { Facts, ResultFacts } from "@/lib/facts";

function label(side: ResultFacts["winner"]) {
  return side.owner === side.teamName ? side.teamName : `${side.owner}, ${side.teamName}`;
}

export function Scoreboard({ facts }: { facts: Facts }) {
  return (
    <section
      aria-label={`Week ${facts.week} scores`}
      className="relative left-1/2 w-screen -translate-x-1/2 bg-navy text-white"
    >
      <ol className="mx-auto max-w-[42rem] px-5 py-6">
        {facts.results.map((r) => (
          <li key={r.winner.teamId} className="border-b border-white/15 py-4 last:border-b-0">
            <div className="flex items-baseline justify-between gap-4 font-display text-lg font-bold leading-tight">
              <span className="min-w-0 truncate">{label(r.winner)}</span>
              <span className="min-w-0 truncate text-right text-white/60">{label(r.loser)}</span>
            </div>
            <div className="mt-1 flex items-baseline justify-between gap-4 font-display font-black leading-none nums text-[clamp(2.5rem,10vw,3.5rem)]">
              <span>{r.winner.points.toFixed(2)}</span>
              <span className="score-hollow">{r.loser.points.toFixed(2)}</span>
            </div>
            {r.winner.topPlayer && (
              <p className="mt-1 text-xs font-medium text-white/55">
                {r.winner.topPlayer.name} {r.winner.topPlayer.points.toFixed(1)}
                {r.loser.topPlayer &&
                  ` for the win. ${r.loser.topPlayer.name} ${r.loser.topPlayer.points.toFixed(1)} in the loss.`}
              </p>
            )}
          </li>
        ))}
      </ol>
    </section>
  );
}
