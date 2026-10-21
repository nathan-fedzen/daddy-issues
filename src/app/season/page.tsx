import type { Metadata } from "next";
import Link from "next/link";
import { league } from "@/config/league";
import { Masthead } from "@/components/masthead";
import { HallOfShame } from "@/components/season/hall-of-shame";
import { OddsChart } from "@/components/season/odds-chart";
import { RobotTallyCard } from "@/components/season/robot-tally";
import { ScheduleSwap } from "@/components/season/schedule-swap";
import { TrophyCase } from "@/components/season/trophy-case";
import { trophyCase } from "@/lib/awards";
import { gamesOf } from "@/lib/facts";
import { seasonWeeks } from "@/lib/issues/queries";
import { hallOfShame, latestOf, oddsHistory, robotTally, scheduleSwap } from "@/lib/season";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: `The season so far | ${league.newsletter.name}`,
  description: "Hall of shame, playoff odds week by week, schedule swaps, and the robot tally.",
};

export default async function SeasonPage() {
  const issues = await seasonWeeks();
  const latest = latestOf(issues);

  if (!latest) {
    return (
      <>
        <Masthead links={[{ href: "/", label: "Latest issue" }]} />
        <main className="mx-auto max-w-[42rem] px-5 py-16">
          <h1 className="headline">No season yet.</h1>
          <p className="mt-4 max-w-[36rem]">The tables fill in once the first issue is published.</p>
        </main>
      </>
    );
  }

  const games = gamesOf(latest.facts);
  const swap = games.length ? scheduleSwap(games, latest.facts.teams) : [];
  const weeksWithRobot = issues.filter((i) => (i.facts.robot ?? []).length > 0).length;

  return (
    <>
      <Masthead links={[{ href: "/", label: "Latest issue" }, { href: "/chugs", label: "Chug tape" }]} />
      <main className="mx-auto max-w-[42rem] px-5 pb-20">
        <h1 className="headline mt-8 mb-4">The season so far</h1>
        <p className="max-w-[36rem]">
          Every number on this page comes from the facts behind each week, through week {latest.week}.
          {issues.some((i) => !i.hasIssue) && " Weeks before the first issue are scored the same way, just never written up."}
        </p>
        <nav aria-label="Sections" className="mt-4 flex flex-wrap gap-x-5 gap-y-1 text-sm font-semibold">
          <Link href="#trophies" className="text-orange underline underline-offset-4">Trophy case</Link>
          <Link href="#robot" className="text-orange underline underline-offset-4">Robot</Link>
          <Link href="#odds" className="text-orange underline underline-offset-4">Playoff odds</Link>
          <Link href="#schedule" className="text-orange underline underline-offset-4">Schedule swap</Link>
          <Link href="#shame" className="text-orange underline underline-offset-4">Hall of shame</Link>
        </nav>

        <TrophyCase shelves={trophyCase(issues)} />

        <RobotTallyCard tally={robotTally(issues)} />
        {league.robot && weeksWithRobot < issues.length && (
          <p className="mt-2 text-xs text-steel">
            {weeksWithRobot === 0 ? "No weeks scored yet." : `${weeksWithRobot} of ${issues.length} weeks scored.`}{" "}
            Earlier issues predate the robot and need a backfill.
          </p>
        )}

        <OddsChart history={oddsHistory(issues)} playoffTeams={latest.facts.playoffs.playoffTeams} />

        {swap.length > 0 ? (
          <ScheduleSwap rows={swap} throughWeek={latest.week} />
        ) : (
          <section id="schedule" className="mt-14">
            <h2 className="section-head">Your record with everyone else&apos;s schedule</h2>
            <p className="text-steel">Needs the week {latest.week} issue backfilled with the season&apos;s games.</p>
          </section>
        )}

        <HallOfShame shame={hallOfShame(issues)} />
      </main>
    </>
  );
}
