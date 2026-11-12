"use client";

import { useDeferredValue, useMemo, useState, useSyncExternalStore } from "react";
import type { Game, Team } from "@/lib/model";
import { scenarioKey, type GameSwing, type Status, type TeamScenario } from "@/lib/scenarios/engine";
import type { OpenState } from "@/lib/scenarios/exact";
import { quickestRoute, type RouteAnswer, type Want } from "@/lib/scenarios/routes";

export interface BoardTeam extends Team {
  owner: string;
  rank: number;
}

interface Props {
  teams: BoardTeam[];
  games: Game[];
  playoffTeams: number;
  // Every team's standing odds and per-game leans, computed on the server.
  base: TeamScenario[];
  initialTeam: string | null;
}

// A lean smaller than this many points of odds is not worth a name.
const MIN_LEAN = 1;

function oddsLabel(odds: number, status: Status): string {
  if (status === "clinched") return "In";
  if (status === "eliminated") return "Out";
  if (odds >= 99.5) return ">99%";
  if (odds < 0.5) return "<1%";
  return `${Math.round(odds)}%`;
}

function verdict(s: TeamScenario, owner: string): string {
  if (s.status === "clinched") return `Clinched. Nothing left on the schedule can keep ${owner} out.`;
  if (s.status === "eliminated") return `Eliminated. No combination of results gets ${owner} in.`;
  const left = s.undecided;
  const any = (n: number) => (n === left ? `all ${left}` : `any ${n} of the last ${left}`);
  const lose = s.elimLosses !== null ? ` Lose ${any(s.elimLosses)} and it is over.` : "";
  if (s.clinchWins !== null) {
    return `Controls it. Win ${any(s.clinchWins)} and ${owner} is in without anyone else's help.${lose}`;
  }
  return `Needs help. Even winning out leaves ${owner} waiting on other results.${lose}`;
}

function ordinal(n: number): string {
  const tail = n % 100;
  if (tail >= 11 && tail <= 13) return `${n}th`;
  return `${n}${["th", "st", "nd", "rd"][n % 10] ?? "th"}`;
}

const results = (n: number) => `${n} result${n === 1 ? "" : "s"}`;

function routeLine(answer: RouteAnswer, owner: string, want: Want): string {
  const verb = want === "in" ? "clinch" : "be eliminated";
  if (!answer.possible) {
    return want === "in"
      ? `No set of results locks ${owner} in outright. The best case still comes down to points.`
      : `No set of results knocks ${owner} out outright. The worst case still comes down to points.`;
  }
  if (!answer.route) return `${owner} can still ${verb}, but it takes more results than fit on a page.`;
  const count = Object.keys(answer.route.results).length;
  return answer.route.earliest
    ? `The soonest ${owner} can ${verb} is week ${answer.route.settledWeek}, and it takes ${results(count)}.`
    : `${owner} can ${verb} by week ${answer.route.settledWeek}. It takes ${results(count)}.`;
}

const subscribe = () => () => {};

interface Routes {
  teamId: string;
  in: RouteAnswer;
  out: RouteAnswer;
}

function PickCell({
  game,
  want,
  answer,
  swing,
  nameOf,
  pad,
}: {
  game: Game;
  want: Want;
  answer: RouteAnswer;
  swing: GameSwing | undefined;
  nameOf: (id: string) => string;
  pad: string;
}) {
  const route = answer.route;
  if (route && game.week > route.settledWeek) return <td className={`py-2 ${pad}`} />;
  const must = route?.results[scenarioKey(game)];
  if (must) {
    return (
      <td className={`py-2 ${pad}`}>
        <span className="font-display text-xl font-black leading-none">{nameOf(must)}</span>
      </td>
    );
  }
  if (!swing || !swing.better || swing.swing < MIN_LEAN) {
    return <td className={`py-2 ${pad} text-sm text-steel`}>either</td>;
  }
  const lean = want === "in" ? swing.better : swing.better === game.homeId ? game.awayId : game.homeId;
  return (
    <td className={`py-2 ${pad} text-sm text-steel`}>
      {nameOf(lean)} <span className="nums">({Math.round(swing.swing)})</span>
    </td>
  );
}

function AfterCell({ week, answer, want, pad }: { week: number; answer: RouteAnswer; want: Want; pad: string }) {
  const route = answer.route;
  if (!route) return <td className={`py-2 ${pad} text-xs font-medium text-steel`}>no guarantee</td>;
  if (week < route.settledWeek) return <td className={`py-2 ${pad} text-xs font-medium text-steel`}>not yet</td>;
  if (week > route.settledWeek) return <td className={`py-2 ${pad}`} />;
  return (
    <td className={`py-2 ${pad}`}>
      <span className="font-display text-2xl font-black leading-none">{want === "in" ? "In" : "Out"}</span>
      <span className="block text-xs font-medium text-steel">guaranteed</span>
    </td>
  );
}

export function ScenarioBoard({ teams, games, playoffTeams, base, initialTeam }: Props) {
  const [selected, setSelected] = useState<string | null>(initialTeam);
  const mounted = useSyncExternalStore(subscribe, () => true, () => false);
  // The search can take a few tenths of a second: let the tap land first.
  const charted = useDeferredValue(selected);

  const state = useMemo<OpenState>(
    () => ({
      wins: Object.fromEntries(teams.map((t) => [t.id, t.wins])),
      open: games.filter((g) => !g.final).sort((a, b) => a.week - b.week),
      playoffTeams,
    }),
    [teams, games, playoffTeams],
  );
  const computed = useMemo<Routes | null>(
    () =>
      mounted && charted
        ? { teamId: charted, in: quickestRoute(state, charted, "in"), out: quickestRoute(state, charted, "out") }
        : null,
    [mounted, charted, state],
  );
  const routes = computed?.teamId === selected ? computed : null;

  const byId = new Map(base.map((s) => [s.teamId, s]));
  const teamById = new Map(teams.map((t) => [t.id, t]));
  const nameOf = (id: string) => teamById.get(id)?.owner ?? `Team ${id}`;
  const allWeeks = [...new Set(state.open.map((g) => g.week))];

  const choose = (id: string) => {
    setSelected(id);
    window.history.replaceState(null, "", `?team=${id}`);
  };

  const team = selected ? teamById.get(selected) : undefined;
  const s = selected ? byId.get(selected) : undefined;
  const swingByKey = new Map((s?.swings ?? []).map((x) => [x.key, x]));
  const lastOf = (a: RouteAnswer) => a.route?.settledWeek ?? allWeeks[allWeeks.length - 1];
  const through = routes ? Math.max(lastOf(routes.in), lastOf(routes.out)) : 0;
  const weeks = allWeeks.filter((w) => w <= through);
  const weight = (g: Game) => {
    if (!routes || !selected) return 0;
    if (g.homeId === selected || g.awayId === selected) return 3;
    const key = scenarioKey(g);
    return Number(Boolean(routes.in.route?.results[key])) + Number(Boolean(routes.out.route?.results[key]));
  };

  return (
    <>
      <p className="max-w-[36rem]">
        Top {playoffTeams} of {teams.length} make it, with {allWeeks.length === 1 ? "one week" : `${allWeeks.length} weeks`}{" "}
        left. Pick an owner to see, week by week, exactly who has to win to lock them in and who has to win to lock
        them out.
      </p>

      <div className="mt-6 grid grid-cols-2 gap-2 sm:grid-cols-3" role="group" aria-label="Owner">
        {teams.map((t) => {
          const sc = byId.get(t.id);
          const on = selected === t.id;
          return (
            <button
              key={t.id}
              type="button"
              aria-pressed={on}
              onClick={() => choose(t.id)}
              className={`flex items-baseline justify-between gap-2 border-2 border-ink px-3 py-2 text-left ${
                on ? "bg-ink text-paper" : "bg-paper hover:bg-mist"
              }`}
            >
              <span className="min-w-0">
                <span className="block truncate font-semibold">{t.owner}</span>
                <span className={`block text-xs font-medium nums ${on ? "text-paper/70" : "text-steel"}`}>
                  {t.wins}-{t.losses}
                </span>
              </span>
              <span className="font-display text-xl font-black leading-none nums">
                {sc ? oddsLabel(sc.odds, sc.status) : ""}
              </span>
            </button>
          );
        })}
      </div>

      {team && s ? (
        <div aria-live="polite">
          <section aria-label={`${team.owner} right now`} className="mt-10">
            <div className="flex items-end justify-between gap-4 border-b-2 border-ink pb-2">
              <div className="min-w-0">
                <h2 className="truncate font-display text-5xl font-black leading-none">{team.owner}</h2>
                <p className="mt-1 text-sm font-medium text-steel nums">
                  {team.name !== team.owner && `${team.name}, `}
                  {team.wins}-{team.losses}, {ordinal(team.rank)} of {teams.length}
                </p>
              </div>
              <p className="shrink-0 text-right">
                <span className="block font-display text-6xl font-black leading-none nums">
                  {oddsLabel(s.odds, s.status)}
                </span>
                <span className="block text-xs font-medium text-steel">to make the playoffs</span>
              </p>
            </div>
            <p className="mt-3 max-w-[36rem] font-semibold">{verdict(s, team.owner)}</p>
          </section>

          {s.status === "alive" && !routes && <p className="mt-8 text-steel">Working out the routes.</p>}

          {s.status === "alive" && routes && (
            <>
              <ul className="mt-4 max-w-[36rem] list-disc pl-5">
                <li>{routeLine(routes.in, team.owner, "in")}</li>
                <li>{routeLine(routes.out, team.owner, "out")}</li>
              </ul>
              <p className="mt-3 max-w-[36rem] text-sm text-steel">
                A name in heavy type is a result that route cannot do without: if every one of them happens, it is
                settled whatever the scores and whatever happens in the other games. A grey name is not required; it is
                just the side that nudges {team.owner}&apos;s odds that way, by the number of points in brackets.
              </p>

              {weeks.map((week) => (
                <section key={week} aria-label={`Week ${week}`}>
                  <h2 className="section-head">Week {week}</h2>
                  <table className="w-full table-fixed border-collapse">
                    <thead>
                      <tr className="text-xs font-medium text-steel">
                        <th scope="col" className="w-[40%] py-1 pr-2 text-left font-medium">
                          Game
                        </th>
                        <th scope="col" className="px-2 py-1 text-left font-medium">
                          Gets {team.owner} in
                        </th>
                        <th scope="col" className="py-1 pl-2 text-left font-medium">
                          Keeps {team.owner} out
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {state.open
                        .filter((g) => g.week === week)
                        .sort((a, b) => weight(b) - weight(a))
                        .map((g) => {
                          const key = scenarioKey(g);
                          return (
                            <tr key={key} className="border-t border-mist align-baseline">
                              <th
                                scope="row"
                                className={`py-2 pr-2 text-left text-sm font-medium ${weight(g) ? "" : "text-steel"}`}
                              >
                                {nameOf(g.homeId)} v {nameOf(g.awayId)}
                              </th>
                              <PickCell game={g} want="in" answer={routes.in} swing={swingByKey.get(key)} nameOf={nameOf} pad="px-2" />
                              <PickCell game={g} want="out" answer={routes.out} swing={swingByKey.get(key)} nameOf={nameOf} pad="pl-2" />
                            </tr>
                          );
                        })}
                    </tbody>
                    <tfoot>
                      <tr className="border-t-2 border-ink align-baseline">
                        <th scope="row" className="py-2 pr-2 text-left text-sm font-semibold">
                          After week {week}
                        </th>
                        <AfterCell week={week} answer={routes.in} want="in" pad="px-2" />
                        <AfterCell week={week} answer={routes.out} want="out" pad="pl-2" />
                      </tr>
                    </tfoot>
                  </table>
                </section>
              ))}

              {weeks.length < allWeeks.length && (
                <p className="mt-8 max-w-[36rem] font-semibold">
                  Both routes are settled by week {through}. Nothing after that would matter.
                </p>
              )}
            </>
          )}
        </div>
      ) : (
        <p className="mt-8 max-w-[36rem] font-semibold">Pick an owner above to see their way in and their way out.</p>
      )}
    </>
  );
}
