import type { SeasonRow } from "@/lib/picks/board";

const head = "py-1 pr-3 text-xs font-medium text-steel whitespace-nowrap";

function streakLabel(n: number): string {
  if (n > 0) return `W${n}`;
  if (n < 0) return `L${-n}`;
  return "–";
}

export function PickStandings({ rows, weeks }: { rows: SeasonRow[]; weeks: number[] }) {
  return (
    <section aria-label="Pick standings" className="mt-14">
      <h2 className="section-head">The board</h2>
      {rows.length === 0 ? (
        <p className="max-w-[36rem]">Nobody has a record yet. It starts the first week anyone locks in.</p>
      ) : (
        <>
          <p className="max-w-[36rem]">Every pick, all season. Ties are pushes and count for nobody.</p>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="text-left">
                  <th className={head} scope="col">
                    Rank
                  </th>
                  <th className={head} scope="col">
                    Who
                  </th>
                  <th className={`${head} text-right`} scope="col">
                    Record
                  </th>
                  <th className={`${head} text-right`} scope="col">
                    Pct
                  </th>
                  <th className={`${head} text-right`} scope="col">
                    Streak
                  </th>
                  {weeks.map((w) => (
                    <th key={w} className={`${head} text-right`} scope="col">
                      Wk {w}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={r.teamId} className="border-t border-mist">
                    <td className="py-2 pr-3 font-display text-xl font-black nums">{i + 1}</td>
                    <td className="py-2 pr-3 font-semibold">{r.owner}</td>
                    <td className="py-2 pr-3 text-right nums">
                      {r.correct}-{r.wrong}
                    </td>
                    <td className="py-2 pr-3 text-right nums">{r.pct}%</td>
                    <td className="py-2 pr-3 text-right nums">{streakLabel(r.streak)}</td>
                    {weeks.map((w) => (
                      <td key={w} className="py-2 pr-3 text-right nums text-steel">
                        {r.weeks[w] ? `${r.weeks[w].correct}-${r.weeks[w].wrong}` : "–"}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </section>
  );
}
