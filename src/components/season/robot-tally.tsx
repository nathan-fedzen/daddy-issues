import { league } from "@/config/league";
import type { RobotTally } from "@/lib/season";

export function RobotTallyCard({ tally }: { tally: RobotTally[] }) {
  const cfg = league.robot;
  if (!cfg || tally.length === 0) return null;
  const focus = tally.find((t) => t.teamId === cfg.teamId);
  const others = tally.filter((t) => t.teamId !== cfg.teamId);
  return (
    <section aria-label={`${cfg.name} tally`} id="robot" className="mt-14">
      <h2 className="section-head">Robot vs {focus?.owner ?? "the league"}</h2>
      <p className="max-w-[36rem]">
        {cfg.name} starts whoever ESPN projects highest, every week, no questions. The same roster, scored both
        ways.
      </p>
      {focus && (
        <>
          <div className="mt-4 grid grid-cols-3 gap-4 border-y-2 border-ink py-3">
            <Stat label={`${focus.owner} wins`} value={String(focus.humanWins)} />
            <Stat label={`${cfg.name} wins`} value={String(focus.robotWins)} />
            <Stat
              label={focus.net > 0 ? "Points the robot is up" : "Points the robot is down"}
              value={Math.abs(focus.net).toFixed(1)}
            />
          </div>
          <table className="mt-4 w-full border-collapse text-sm nums">
            <thead>
              <tr className="text-left text-xs font-medium text-steel">
                <th className="py-1 pr-2 font-medium" scope="col">
                  Week
                </th>
                <th className="py-1 pr-2 text-right font-medium" scope="col">
                  {focus.owner}
                </th>
                <th className="py-1 pr-2 text-right font-medium" scope="col">
                  {cfg.name}
                </th>
                <th className="py-1 text-right font-medium" scope="col">
                  Verdict
                </th>
              </tr>
            </thead>
            <tbody>
              {focus.weeks.map((w) => (
                <tr key={w.week} className="border-t border-mist">
                  <td className="py-2 pr-2 font-display text-xl font-black">{w.week}</td>
                  <td className={`py-2 pr-2 text-right ${w.diff < 0 ? "font-semibold" : "text-steel"}`}>
                    {w.actual.toFixed(2)}
                    <span className="block text-xs font-normal text-steel">{w.actualWon ? "won" : "lost"}</span>
                  </td>
                  <td className={`py-2 pr-2 text-right ${w.diff > 0 ? "font-semibold" : "text-steel"}`}>
                    {w.robot.toFixed(2)}
                    <span className="block text-xs font-normal text-steel">{w.robotWon ? "would win" : "would lose"}</span>
                  </td>
                  <td className="py-2 text-right text-xs">
                    {w.diff > 0 ? `Robot by ${w.diff.toFixed(1)}` : w.diff < 0 ? `Human by ${(-w.diff).toFixed(1)}` : "Even"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}
      {others.length > 0 && (
        <details className="mt-6">
          <summary className="cursor-pointer font-semibold text-orange underline underline-offset-4">
            Would the robot beat you too?
          </summary>
          <ul className="mt-2 divide-y divide-mist border-y border-mist text-sm">
            {others.map((t) => (
              <li key={t.teamId} className="flex items-baseline justify-between gap-4 py-2">
                <span>
                  <span className="font-semibold">{t.owner}</span>
                  <span className="block text-xs text-steel">
                    Robot ahead in {t.robotAhead} of {t.weeks.length} weeks
                  </span>
                </span>
                <span className={`font-display text-xl font-black nums ${t.net > 0 ? "text-orange" : ""}`}>
                  {t.net > 0 ? "+" : ""}
                  {t.net.toFixed(1)}
                </span>
              </li>
            ))}
          </ul>
          <p className="mt-2 text-xs text-steel">Net points the projection lineup would have added over the season.</p>
        </details>
      )}
    </section>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="font-display text-4xl font-black leading-none nums">{value}</p>
      <p className="text-xs font-medium text-steel">{label}</p>
    </div>
  );
}
