import type { Issue, IssueSummary } from "@/lib/issues/store";
import { formatDate } from "@/lib/issues/queries";
import { Masthead } from "./masthead";
import { Scoreboard } from "./scoreboard";
import { IssueBody } from "./issue-body";
import { Standings } from "./standings";
import { Archive } from "./archive";

export function IssuePage({ issue, archive }: { issue: Issue; archive: IssueSummary[] }) {
  return (
    <>
      <Masthead week={issue.week} date={formatDate(issue.publishedAt ?? issue.generatedAt)} />
      <main className="mx-auto max-w-[42rem] px-5 pb-20">
        <h1 className="mt-8 mb-8 max-w-[14ch] font-display text-[clamp(2.5rem,9vw,4rem)] font-bold leading-[0.95] tracking-[-0.01em]">
          {issue.headline}
        </h1>
        <Scoreboard facts={issue.facts} />
        <article className="mt-6">
          <IssueBody markdown={issue.markdown} />
        </article>
        <Standings facts={issue.facts} />
        <Archive issues={archive} currentWeek={issue.week} />
        {issue.markdown.includes("giphy.com") && (
          <p className="mt-14 text-xs text-steel">GIFs via GIPHY.</p>
        )}
      </main>
    </>
  );
}
