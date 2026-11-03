import type { Metadata } from "next";
import { league, ownerName } from "@/config/league";
import { Masthead } from "@/components/masthead";
import { PicksBanner } from "@/components/picks/banner";
import { Ballot, type BallotGame, type BallotVoter } from "@/components/picks/ballot";
import { LockedBoard, type BoardMatchup } from "@/components/picks/locked-board";
import { PickStandings } from "@/components/picks/standings";
import type { Game, Team } from "@/lib/model";
import { gameKey, seasonBoard, votesByGame, winnerOf } from "@/lib/picks/board";
import { fetchSlate } from "@/lib/picks/live";
import { listPicks } from "@/lib/picks/queries";
import { lockLabel, pickWindow, pickWindowFor, type PickWindow } from "@/lib/picks/time";
import { reviewKeyValid } from "@/lib/review-key";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: `Picks | ${league.newsletter.name}`,
  description: "Pick every winner in the league this week, then watch it go wrong live.",
};

const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

// ?preview=open|locked[&week=N] forces a view for checking the page; it needs
// key=<REVIEW_KEY> outside dev. Submitting still runs on the real clock.
function windowFor(preview: string | undefined, week: string | undefined, allowed: boolean): { window: PickWindow; previewing: boolean } {
  const real = pickWindow();
  if (!allowed || (preview !== "open" && preview !== "locked")) return { window: real, previewing: false };
  const n = Number(week);
  const base = Number.isInteger(n) && n > 0 ? pickWindowFor(n) : real;
  return { window: { ...base, open: preview === "open" }, previewing: true };
}

function recordOf(t: Team | undefined): string {
  if (!t) return "";
  return `${t.wins}-${t.losses}${t.ties ? `-${t.ties}` : ""}`;
}

export default async function PicksPage({ searchParams }: PageProps<"/picks">) {
  const sp = await searchParams;
  const canPreview = reviewKeyValid(one(sp.key)) || process.env.NODE_ENV === "development";
  const { window, previewing } = windowFor(one(sp.preview), one(sp.week), canPreview);
  const [slate, sheets] = await Promise.all([fetchSlate(), listPicks(league.season)]);

  const teamById = new Map(slate.teams.map((t) => [t.id, t]));
  const nameOf = (id: string) => ownerName(id, teamById.get(id)?.name ?? `Team ${id}`);
  const games = slate.games.filter((g) => g.week === window.week);
  const weekSheets = sheets.filter((s) => s.week === window.week);
  const voted = new Set(weekSheets.map((s) => s.teamId));
  const voters: BallotVoter[] = Object.entries(league.teams)
    .map(([teamId, t]) => ({ teamId, owner: t.owner.trim() || `Team ${teamId}`, locked: voted.has(teamId) }))
    .sort((a, b) => a.owner.localeCompare(b.owner));
  const started = games.some((g) => g.final || g.homePoints + g.awayPoints > 0);
  const allFinal = games.length > 0 && games.every((g) => g.final);

  const side = (id: string) => ({
    teamId: id,
    owner: nameOf(id),
    teamName: teamById.get(id)?.name.trim() ?? "",
    record: recordOf(teamById.get(id)),
  });
  const ballotGames: BallotGame[] = games.map((g) => ({ key: gameKey(g), home: side(g.homeId), away: side(g.awayId) }));
  const votes = votesByGame(weekSheets, games);
  const matchups: BoardMatchup[] = games.map((g: Game, i) => ({
    key: gameKey(g),
    home: { ...side(g.homeId), points: g.homePoints, voters: votes[i].home },
    away: { ...side(g.awayId), points: g.awayPoints, voters: votes[i].away },
    started: g.final || g.homePoints + g.awayPoints > 0,
    final: g.final,
    winner: winnerOf(g),
  }));
  const weeks = [...new Set(sheets.map((s) => s.week))].sort((a, b) => a - b);

  return (
    <>
      <Masthead
        week={window.week}
        links={[
          { href: "/", label: "Latest issue" },
          { href: "/season", label: "Season" },
        ]}
      />
      <PicksBanner
        open={window.open}
        week={window.week}
        lockAt={lockLabel(window.lockAt)}
        submitted={weekSheets.length}
        total={voters.length}
        started={started}
        allFinal={allFinal}
      />
      <main className="mx-auto max-w-[42rem] px-5 pb-20">
        {previewing && (
          <p className="mt-4 border-2 border-orange px-3 py-2 text-sm font-medium">
            Preview of the {window.open ? "open" : "locked"} view for week {window.week}. Ballots still obey the real clock.
          </p>
        )}
        {games.length === 0 ? (
          <p className="mt-8 max-w-[36rem]">No games on the schedule for week {window.week}.</p>
        ) : window.open ? (
          <Ballot week={window.week} games={ballotGames} voters={voters} lockAt={lockLabel(window.lockAt)} />
        ) : (
          <LockedBoard
            week={window.week}
            matchups={matchups}
            nonVoters={voters.filter((v) => !v.locked).map((v) => v.owner)}
          />
        )}
        <PickStandings rows={seasonBoard(sheets, slate.games)} weeks={weeks} />
      </main>
    </>
  );
}
