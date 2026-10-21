import type { ScheduleSwapRow, WinLoss } from "@/lib/season";

const rec = (r: WinLoss) => `${r.wins}-${r.losses}`;

export function ScheduleSwap({ rows, throughWeek }: { rows: ScheduleSwapRow[]; throughWeek: number }) {
  if (rows.length === 0) return null;
  const sorted = [...rows].sort((a, b) => b.unluckier - a.unluckier || a.luckier - b.luckier);
  const order = rows;
  return (
    <section aria-label="Schedule swap" id="schedule" className="mt-14">
      <h2 className="section-head">Your record with everyone else&apos;s schedule</h2>
      <p className="max-w-[36rem]">
        Same scores, different opponents. Each row is one team replaying its weeks against the people someone else
        played. Through week {throughWeek}.
      </p>
      <ul className="mt-4 divide-y divide-mist border-y border-mist">
        {sorted.map((r) => (
          <li key={r.teamId} className="flex items-baseline justify-between gap-4 py-2">
            <span className="min-w-0">
              <span className="font-semibold">{r.owner}</span>
              <span className="block text-xs text-steel">
                {r.unluckier === 0
                  ? "Nobody's schedule would have helped."
                  : r.luckier === 0
                    ? "Any other schedule would have been worse. Say thank you."
                    : `${r.unluckier} of ${rows.length - 1} schedules would have been better.`}
              </span>
            </span>
            <span className="shrink-0 text-right font-display text-xl font-black leading-none nums">
              {rec(r.actual)}
              <span className="block text-xs font-medium text-steel">
                best {rec(r.best)} · worst {rec(r.worst)}
              </span>
            </span>
          </li>
        ))}
      </ul>
      <div className="mt-6 overflow-x-auto">
        <table className="w-full border-collapse text-xs nums">
          <caption className="mb-2 text-left text-xs text-steel">
            Rows: the team. Columns: whose schedule. Diagonal is the real record.
          </caption>
          <thead>
            <tr>
              <th className="sticky left-0 bg-paper py-1 pr-2 text-left font-medium text-steel" scope="col">
                with schedule of
              </th>
              {order.map((c) => (
                <th key={c.teamId} className="px-1 py-1 text-right font-medium text-steel" scope="col">
                  {c.owner.slice(0, 4)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {order.map((r) => (
              <tr key={r.teamId} className="border-t border-mist">
                <th className="sticky left-0 bg-paper py-1 pr-2 text-left font-semibold" scope="row">
                  {r.owner}
                </th>
                {order.map((c) => {
                  const w = r.withSchedule[c.teamId];
                  const self = c.teamId === r.teamId;
                  const better = !self && w.wins - w.losses > r.actual.wins - r.actual.losses;
                  const worse = !self && w.wins - w.losses < r.actual.wins - r.actual.losses;
                  return (
                    <td
                      key={c.teamId}
                      className={`px-1 py-1 text-right ${self ? "bg-ink font-bold text-paper" : better ? "text-orange" : worse ? "text-steel" : ""}`}
                    >
                      {w ? rec(w) : ""}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-2 text-xs text-steel">Orange is a better record than the real one, grey is worse.</p>
    </section>
  );
}
