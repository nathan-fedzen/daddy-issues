import type { Facts, ResultFacts } from "@/lib/facts";

function Side({ side, align }: { side: ResultFacts["winner"]; align: "left" | "right" }) {
  const right = align === "right";
  return (
    <span className={`min-w-0 ${right ? "text-right text-white/55" : "border-l-4 border-orange pl-2"}`}>
      <span className="block truncate">{side.owner}</span>
      {side.owner !== side.teamName && (
        <span className="block truncate font-body text-xs font-medium text-white/45">{side.teamName}</span>
      )}
    </span>
  );
}

export function Scoreboard({ facts }: { facts: Facts }) {
  return (
    <section
      aria-label={`Week ${facts.week} scores`}
      className="scoreboard relative left-1/2 w-screen -translate-x-1/2 bg-navy text-white"
    >
      <div className="mx-auto max-w-[42rem] px-5 pt-12 pb-10">
        <p className="mb-2 font-display text-xl font-bold leading-none text-orange">
          Week {facts.week} scores
        </p>
        <ol>
          {facts.results.map((r) => (
            <li key={r.winner.teamId} className="border-b border-white/15 py-4 last:border-b-0">
              <div className="flex items-start justify-between gap-4 font-display text-xl font-bold leading-tight">
                <Side side={r.winner} align="left" />
                <Side side={r.loser} align="right" />
              </div>
              <div className="mt-1 flex items-baseline justify-between gap-4 pl-3 font-display font-black leading-none nums text-[clamp(2.75rem,11vw,4rem)]">
                <span>{r.winner.points.toFixed(2)}</span>
                <span className="score-hollow">{r.loser.points.toFixed(2)}</span>
              </div>
              {r.winner.topPlayer && (
                <p className="mt-1 pl-3 text-xs font-medium text-white/55">
                  {r.winner.topPlayer.name} {r.winner.topPlayer.points.toFixed(1)}
                  {r.loser.topPlayer &&
                    ` for the win. ${r.loser.topPlayer.name} ${r.loser.topPlayer.points.toFixed(1)} in the loss.`}
                </p>
              )}
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
