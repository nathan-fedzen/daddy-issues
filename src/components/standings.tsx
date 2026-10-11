import type { Facts } from "@/lib/facts";

export function Standings({ facts }: { facts: Facts }) {
  const odds = new Map(facts.playoffs.odds.map((o) => [o.teamId, o.odds]));
  return (
    <section aria-label="Standings" className="mt-14">
      <h2 className="relative border-t-2 border-ink pt-2 font-display text-[2rem] font-bold leading-none before:absolute before:-top-[2px] before:left-0 before:h-[6px] before:w-8 before:bg-orange">
        The table after week {facts.week}
      </h2>
      <table className="mt-4 w-full border-collapse text-sm">
        <thead>
          <tr className="text-left text-xs font-medium text-steel">
            <th className="py-1 pr-2 font-medium" scope="col">
              Rank
            </th>
            <th className="py-1 pr-2 font-medium" scope="col">
              Team
            </th>
            <th className="py-1 pr-2 text-right font-medium" scope="col">
              Record
            </th>
            <th className="py-1 pr-2 text-right font-medium" scope="col">
              Points
            </th>
            <th className="py-1 pr-2 text-right font-medium" scope="col">
              Streak
            </th>
            <th className="py-1 text-right font-medium" scope="col">
              Playoffs
            </th>
          </tr>
        </thead>
        <tbody>
          {facts.teams.map((t) => {
            const inLine = t.standingsRank <= facts.playoffs.playoffTeams;
            return (
              <tr
                key={t.teamId}
                className={`border-t border-mist ${inLine ? "" : "text-steel"} ${
                  t.standingsRank === facts.playoffs.playoffTeams ? "border-b-2 border-b-ink" : ""
                }`}
              >
                <td className="py-2 pr-2 font-display text-xl font-black nums">{t.standingsRank}</td>
                <td className="py-2 pr-2">
                  <span className="font-semibold text-ink">{t.owner}</span>
                  {t.owner !== t.teamName && <span className="block text-xs text-steel">{t.teamName}</span>}
                </td>
                <td className="py-2 pr-2 text-right nums">{t.record}</td>
                <td className="py-2 pr-2 text-right nums">{t.pointsFor.toFixed(1)}</td>
                <td className="py-2 pr-2 text-right nums">{t.streak}</td>
                <td className="py-2 text-right font-display text-lg font-bold nums">
                  {Math.round(odds.get(t.teamId) ?? 0)}%
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <p className="mt-2 text-xs text-steel">
        Playoff odds from {facts.playoffs.sims.toLocaleString()} simulations of the remaining{" "}
        {facts.playoffs.weeksRemaining} weeks. Top {facts.playoffs.playoffTeams} get in.
      </p>
    </section>
  );
}
