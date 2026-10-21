import type { Issue, IssueSummary } from "@/lib/issues/store";
import { formatDate } from "@/lib/issues/queries";
import { Masthead } from "./masthead";
import { Scoreboard } from "./scoreboard";
import { IssueBody } from "./issue-body";
import { Standings } from "./standings";
import { Archive } from "./archive";
import { ChugCallout } from "./chug-callout";
import { VillainWatch } from "./villain-watch";
import { RobotCard } from "./robot-card";
import { BenchTeam } from "./bench-team";
import { Hardware } from "./hardware";
import { Letters } from "./letters";

export function IssuePage({ issue, archive }: { issue: Issue; archive: IssueSummary[] }) {
  return (
    <>
      <Masthead
        week={issue.week}
        date={formatDate(issue.publishedAt ?? issue.generatedAt)}
        links={[
          { href: "/season", label: "Season" },
          { href: "/chugs", label: "Chug tape" },
        ]}
      />
      <main className="mx-auto max-w-[42rem] px-5 pb-20">
        <h1 className="headline mt-8 mb-8 text-balance">
          {issue.headline}
        </h1>
        <Scoreboard facts={issue.facts} />
        <VillainWatch facts={issue.facts} />
        <article className="mt-6">
          <IssueBody markdown={issue.markdown} />
        </article>
        <ChugCallout facts={issue.facts} />
        <Hardware facts={issue.facts} />
        <RobotCard facts={issue.facts} />
        <BenchTeam facts={issue.facts} />
        <Letters season={issue.season} week={issue.week} />
        <Standings facts={issue.facts} />
        <Archive issues={archive} currentWeek={issue.week} />
        {issue.markdown.includes("giphy.com") && (
          <p className="mt-14 text-xs text-steel">GIFs via GIPHY.</p>
        )}
      </main>
    </>
  );
}
