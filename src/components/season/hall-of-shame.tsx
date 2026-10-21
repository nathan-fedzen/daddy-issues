import type { Shame } from "@/lib/season";

export function HallOfShame({ shame }: { shame: Shame }) {
  return (
    <section aria-label="Hall of shame" id="shame" className="mt-14">
      <h2 className="section-head">Hall of shame</h2>
      <p className="max-w-[36rem]">Season totals. Nothing here resets.</p>

      <Sub title="Points left on the bench">
        <table className="w-full border-collapse text-sm nums">
          <thead>
            <tr className="text-left text-xs font-medium text-steel">
              <th className="py-1 pr-2 font-medium" scope="col">
                Owner
              </th>
              <th className="py-1 pr-2 text-right font-medium" scope="col">
                Left behind
              </th>
              <th className="py-1 text-right font-medium" scope="col">
                Games it cost
              </th>
            </tr>
          </thead>
          <tbody>
            {shame.benchPoints.map((b, i) => (
              <tr key={b.teamId} className={`border-t border-mist ${i === 0 ? "font-semibold" : ""}`}>
                <td className="py-2 pr-2">{b.owner}</td>
                <td className="py-2 pr-2 text-right font-display text-xl font-black">{b.total.toFixed(1)}</td>
                <td className={`py-2 text-right ${b.gamesCost ? "text-orange" : "text-steel"}`}>{b.gamesCost}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Sub>

      <Sub title="Lowest scores of the year">
        <Ranked
          rows={shame.lowestWeeks.map((l) => ({
            key: `${l.teamId}-${l.week}`,
            who: l.owner,
            detail: `Week ${l.week}`,
            value: l.points.toFixed(2),
          }))}
        />
      </Sub>

      <Sub title="Worst start/sit calls">
        <Ranked
          rows={shame.worstSwaps.map((s) => ({
            key: `${s.teamId}-${s.week}`,
            who: s.owner,
            detail: `Week ${s.week}: started ${s.started} over ${s.benched}${s.costTheGame ? ". Lost the game." : ""}`,
            value: `-${s.gain.toFixed(1)}`,
          }))}
        />
      </Sub>

      <Sub title="Biggest beatdowns">
        <Ranked
          rows={shame.blowouts.map((b) => ({
            key: `${b.week}-${b.loser.teamId}`,
            who: b.loser.owner,
            detail: `Week ${b.week}, by ${b.winner.owner}`,
            value: b.margin.toFixed(2),
          }))}
        />
      </Sub>

      {shame.losingStreaks.length > 0 && (
        <Sub title="Losing streaks">
          <Ranked
            rows={shame.losingStreaks.map((s) => ({
              key: s.teamId,
              who: s.owner,
              detail: `Weeks ${s.from} to ${s.to}${s.alive ? ". Still going." : ""}`,
              value: `${s.length}L`,
            }))}
          />
        </Sub>
      )}

      {shame.chugs.length > 0 && (
        <Sub title="Chugs owed">
          <Ranked
            rows={shame.chugs.map((c) => ({
              key: c.teamId,
              who: c.owner,
              detail: c.count === 1 ? "One zero-point starter" : `${c.count} zero-point starters`,
              value: String(c.count),
            }))}
          />
        </Sub>
      )}

      {shame.dropReadds.length > 0 && (
        <Sub title="Dropped him, picked him back up">
          <Ranked
            rows={shame.dropReadds.map((d) => ({
              key: d.teamId,
              who: d.owner,
              detail: d.count === 1 ? "Once" : `${d.count} times`,
              value: String(d.count),
            }))}
          />
        </Sub>
      )}
    </section>
  );
}

function Sub({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mt-8">
      <h3 className="mb-2 font-display text-2xl font-bold leading-none">{title}</h3>
      {children}
    </div>
  );
}

function Ranked({ rows }: { rows: { key: string; who: string; detail: string; value: string }[] }) {
  if (rows.length === 0) return <p className="text-sm text-steel">Nothing yet.</p>;
  return (
    <ol className="divide-y divide-mist border-y border-mist">
      {rows.map((r, i) => (
        <li key={r.key} className="flex items-baseline gap-3 py-2">
          <span className="w-6 shrink-0 font-display text-xl font-black leading-none nums text-steel">{i + 1}</span>
          <span className="min-w-0 grow">
            <span className="font-semibold">{r.who}</span>
            <span className="block text-xs text-steel">{r.detail}</span>
          </span>
          <span className="shrink-0 font-display text-xl font-black leading-none nums">{r.value}</span>
        </li>
      ))}
    </ol>
  );
}
