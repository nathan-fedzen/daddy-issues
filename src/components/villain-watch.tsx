import { league } from "@/config/league";
import { gamesOf, type Facts } from "@/lib/facts";

// Length of the win run that ended with this week's loss, so the counter can
// show what DJ just threw away. Needs the season's games on the facts.
function streakBroken(facts: Facts, teamId: string): number {
  const mine = gamesOf(facts)
    .filter((g) => g.homeId === teamId || g.awayId === teamId)
    .sort((a, b) => a.week - b.week)
    .map((g) => (g.homeId === teamId ? g.homePoints > g.awayPoints : g.awayPoints > g.homePoints));
  if (mine.length === 0 || mine[mine.length - 1]) return 0;
  let n = 0;
  for (let i = mine.length - 2; i >= 0 && mine[i]; i--) n++;
  return n;
}

export function VillainWatch({ facts }: { facts: Facts }) {
  const id = league.villainTeamId;
  if (!id) return null;
  const team = facts.teams.find((t) => t.teamId === id);
  if (!team) return null;
  const result = facts.results.find((r) => r.winner.teamId === id || r.loser.teamId === id);
  if (!result) return null;
  const lost = result.loser.teamId === id && !result.tie;
  const mine = result.winner.teamId === id ? result.winner : result.loser;
  const theirs = result.winner.teamId === id ? result.loser : result.winner;
  const streakLen = Number(team.streak.slice(1)) || 0;
  const sinceLoss = team.streak[0] === "W" ? streakLen : 0;
  const broken = lost ? streakBroken(facts, id) : 0;
  const ticker = lost
    ? `${team.owner} lost · public holiday · ${team.owner} lost · ${mine.points.toFixed(2)} to ${theirs.points.toFixed(2)} · `
    : `${team.owner} won · under review · suspicious · ${mine.points.toFixed(2)} to ${theirs.points.toFixed(2)} · `;

  return (
    <aside aria-label={`${team.owner} watch`} className={`villain mt-6 ${lost ? "villain-lost" : "villain-won"}`}>
      <div className="villain-ticker" aria-hidden>
        <div className="villain-ticker-track">
          <span>{ticker.repeat(3)}</span>
          <span>{ticker.repeat(3)}</span>
        </div>
      </div>
      <div className="relative border-b-2 border-ink py-3">
        <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-2">
          <p className="villain-headline font-display font-black leading-none">
            {team.owner} {lost ? "lost." : "won."}
          </p>
          <p className="villain-stamp" aria-hidden>
            {lost ? "Public holiday" : "Under investigation"}
          </p>
        </div>
        <p className="mt-1 text-sm">
          <span className="font-semibold">
            {mine.points.toFixed(2)} to {theirs.points.toFixed(2)} against {theirs.owner}.
          </span>{" "}
          <span className="text-steel">{lost ? "Nobody is sorry." : "Nobody believes it."}</span>
        </p>
        <dl className="mt-3 grid grid-cols-3 gap-4 sm:grid-cols-4">
          <Stat label="Record" value={team.record} />
          <div>
            <dd className="font-display text-3xl font-black leading-none nums">
              {lost && broken > 0 && (
                <span className="villain-broken mr-2 text-steel">{broken}</span>
              )}
              <span className="villain-count" style={{ ["--n" as string]: sinceLoss }}>
                <span className="sr-only">{sinceLoss}</span>
              </span>
            </dd>
            <dt className="text-xs font-medium text-steel">Weeks since a loss</dt>
          </div>
          <Stat label="Seed" value={String(team.standingsRank)} />
          <Stat label="Scoring rank" value={String(team.pointsForRank)} hide />
        </dl>
      </div>
    </aside>
  );
}

function Stat({ label, value, hide }: { label: string; value: string; hide?: boolean }) {
  return (
    <div className={hide ? "hidden sm:block" : ""}>
      <dd className="font-display text-3xl font-black leading-none nums">{value}</dd>
      <dt className="text-xs font-medium text-steel">{label}</dt>
    </div>
  );
}
