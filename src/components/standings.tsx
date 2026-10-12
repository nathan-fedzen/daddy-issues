import type { Facts } from "@/lib/facts";

const head = "py-1 pr-2 text-xs font-medium text-steel";

export function Standings({ facts }: { facts: Facts }) {
  const odds = new Map(facts.playoffs.odds.map((o) => [o.teamId, o.odds]));
  return (
    <section aria-label="Standings" className="mt-14">
      <h2 className="section-head">The table after week {facts.week}</h2>
      <table className="mt-4 w-full border-collapse text-sm">
        <thead>
          <tr className="text-left">
            <th className={head} scope="col">
              Rank
            </th>
            <th className={head} scope="col">
              Team
            </th>
            <th className={`${head} text-right`} scope="col">
              Record
            </th>
            <th className={`${head} hidden text-right sm:table-cell`} scope="col">
              Points
            </th>
            <th className={`${head} hidden text-right sm:table-cell`} scope="col">
              Streak
            </th>
            <th className={`${head} pr-0 text-right`} scope="col">
              Playoffs
            </th>
          </tr>
        </thead>
        <tbody>
          {facts.teams.map((t) => {
            const inLine = t.standingsRank <= facts.playoffs.playoffTeams;
            const pct = Math.round(odds.get(t.teamId) ?? 0);
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
                  {t.owner !== t.teamName && (
                    <span className="block text-xs text-steel">
                      {t.teamName}
                      <span className="sm:hidden">
                        {" "}
                        · {t.pointsFor.toFixed(0)} pts · {t.streak}
                      </span>
                    </span>
                  )}
                </td>
                <td className="py-2 pr-2 text-right nums">{t.record}</td>
                <td className="hidden py-2 pr-2 text-right nums sm:table-cell">{t.pointsFor.toFixed(1)}</td>
                <td className="hidden py-2 pr-2 text-right nums sm:table-cell">{t.streak}</td>
                <td className="py-2 pl-2 text-right">
                  <span className="relative inline-block min-w-[3.5rem] font-display text-lg font-bold nums">
                    <span
                      aria-hidden
                      className="absolute inset-y-0 right-0 -z-10 bg-orange/20"
                      style={{ width: `${pct}%` }}
                    />
                    <span className="relative px-1">{pct}%</span>
                  </span>
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
