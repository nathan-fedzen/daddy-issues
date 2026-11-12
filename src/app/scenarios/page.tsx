import type { Metadata } from "next";
import { league, ownerName } from "@/config/league";
import { Masthead } from "@/components/masthead";
import { ScenarioBoard, type BoardTeam } from "@/components/scenarios/board";
import { runSims, teamScenario } from "@/lib/scenarios/engine";
import { fetchScenarioLeague } from "@/lib/scenarios/live";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: `Playoff scenarios | ${league.newsletter.name}`,
  description: "Pick an owner and see, week by week, who has to win to get them into the playoffs and who has to win to keep them out.",
};

const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

const links = [
  { href: "/", label: "Latest issue" },
  { href: "/picks", label: "Picks" },
  { href: "/season", label: "Season" },
];

export default async function ScenariosPage({ searchParams }: PageProps<"/scenarios">) {
  const sp = await searchParams;
  const data = await fetchScenarioLeague();
  const open = data.games.filter((g) => !g.final);

  if (open.length === 0) {
    return (
      <>
        <Masthead links={links} />
        <main className="mx-auto max-w-[42rem] px-5 py-16">
          <h1 className="headline">The field is set.</h1>
          <p className="mt-4 max-w-[36rem]">
            The regular season is over, so there is nothing left to work out. The standings in the latest issue are
            the bracket.
          </p>
        </main>
      </>
    );
  }

  const standing = [...data.teams].sort((a, b) => b.wins - a.wins || b.pointsFor - a.pointsFor);
  const teams: BoardTeam[] = standing.map((t, i) => ({
    ...t,
    name: t.name.trim(),
    owner: ownerName(t.id, t.name),
    rank: i + 1,
  }));
  const run = runSims(data.teams, data.games, data.playoffTeams);
  const base = teams.map((t) => teamScenario(run, t.id));
  const asked = one(sp.team);

  return (
    <>
      <Masthead week={open[0].week} links={links} />
      <main className="mx-auto max-w-[42rem] px-5 pb-20">
        <h1 className="headline mt-8 mb-4">Who gets in</h1>
        <ScenarioBoard
          teams={teams}
          games={data.games}
          playoffTeams={data.playoffTeams}
          base={base}
          initialTeam={teams.some((t) => t.id === asked) ? asked! : null}
        />
      </main>
    </>
  );
}
