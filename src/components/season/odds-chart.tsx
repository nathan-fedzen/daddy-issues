import type { OddsHistory } from "@/lib/season";

const W = 160;
const H = 56;
const PAD = 4;

function path(points: { week: number; odds: number }[], weeks: number[]): string {
  const x = (week: number) =>
    weeks.length === 1 ? W / 2 : PAD + ((week - weeks[0]) / (weeks[weeks.length - 1] - weeks[0])) * (W - PAD * 2);
  const y = (odds: number) => PAD + (1 - odds / 100) * (H - PAD * 2);
  return points.map((p, i) => `${i === 0 ? "M" : "L"}${x(p.week).toFixed(1)},${y(p.odds).toFixed(1)}`).join(" ");
}

export function OddsChart({ history, playoffTeams }: { history: OddsHistory[]; playoffTeams: number }) {
  if (history.length === 0) return null;
  const weeks = [...new Set(history.flatMap((h) => h.points.map((p) => p.week)))].sort((a, b) => a - b);
  return (
    <section aria-label="Playoff odds over time" id="odds" className="mt-14">
      <h2 className="section-head">Playoff odds, week by week</h2>
      <p className="max-w-[36rem]">
        Each line is one team&apos;s chance of making the top {playoffTeams}, as printed in every issue since week{" "}
        {weeks[0]}. The ones falling off a cliff know who they are.
      </p>
      <ul className="mt-6 grid grid-cols-2 gap-x-6 gap-y-8 sm:grid-cols-3">
        {history.map((h, i) => {
          const last = h.points[h.points.length - 1];
          const inLine = i < playoffTeams;
          return (
            <li key={h.teamId} className={inLine ? "" : "text-steel"}>
              <div className="flex items-baseline justify-between gap-2">
                <span className="truncate font-semibold text-ink">{h.owner}</span>
                <span className="font-display text-2xl font-black leading-none nums text-ink">
                  {Math.round(h.current)}%
                </span>
              </div>
              <svg
                viewBox={`0 0 ${W} ${H}`}
                className="mt-1 block w-full border-b border-mist"
                role="img"
                aria-label={`${h.owner}: ${h.points.map((p) => `week ${p.week} ${Math.round(p.odds)}%`).join(", ")}`}
              >
                <line x1={PAD} x2={W - PAD} y1={H / 2} y2={H / 2} stroke="#e6e6e6" strokeDasharray="2 3" />
                <path d={path(h.points, weeks)} fill="none" stroke={inLine ? "#000" : "#6e6e73"} strokeWidth="2" />
                {last && weeks.length > 1 && (
                  <circle
                    cx={PAD + ((last.week - weeks[0]) / (weeks[weeks.length - 1] - weeks[0])) * (W - PAD * 2)}
                    cy={PAD + (1 - last.odds / 100) * (H - PAD * 2)}
                    r="3"
                    fill="#fb4f14"
                  />
                )}
              </svg>
              <p className="mt-1 text-xs font-medium nums">
                {h.change === 0 ? "No change" : `${h.change > 0 ? "Up" : "Down"} ${Math.abs(h.change).toFixed(0)} this week`}
              </p>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
