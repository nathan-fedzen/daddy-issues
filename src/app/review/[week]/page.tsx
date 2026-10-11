import { notFound } from "next/navigation";
import { Masthead } from "@/components/masthead";
import { Scoreboard } from "@/components/scoreboard";
import { IssueBody } from "@/components/issue-body";
import { Standings } from "@/components/standings";
import { anyIssue, formatDate } from "@/lib/issues/queries";
import { reviewKeyValid } from "@/lib/review-key";
import { publishAction, regenerateAction } from "./actions";

export const dynamic = "force-dynamic";

const button =
  "border-2 border-ink px-4 py-2 font-display text-lg font-bold hover:bg-ink hover:text-white";

export default async function ReviewPage({ params, searchParams }: PageProps<"/review/[week]">) {
  const { week } = await params;
  const { key, status } = await searchParams;
  const keyValue = Array.isArray(key) ? key[0] : key;
  if (!reviewKeyValid(keyValue)) notFound();
  const n = Number(week);
  if (!Number.isInteger(n) || n < 1) notFound();
  const issue = await anyIssue(n);

  return (
    <>
      <Masthead week={n} date={issue ? formatDate(issue.generatedAt) : ""} />
      <main className="mx-auto max-w-[42rem] px-5 pb-20">
        <section className="my-6 border-2 border-ink p-4">
          <p className="font-display text-2xl font-bold leading-none">
            Review: week {n} is {issue ? issue.status : "not generated"}
          </p>
          {status && <p className="mt-2 text-sm text-steel">Last action: {status}</p>}
          {issue && (
            <p className="mt-2 text-sm text-steel">
              Written by {issue.model} at {formatDate(issue.generatedAt)}.
            </p>
          )}
          <div className="mt-4 flex flex-wrap gap-3">
            {issue && issue.status === "draft" && (
              <form action={publishAction}>
                <input type="hidden" name="key" value={keyValue} />
                <input type="hidden" name="week" value={n} />
                <button className={`${button} bg-orange border-orange text-white hover:bg-ink hover:border-ink`}>
                  Publish week {n}
                </button>
              </form>
            )}
            <form action={regenerateAction}>
              <input type="hidden" name="key" value={keyValue} />
              <input type="hidden" name="week" value={n} />
              <button className={button}>{issue ? "Regenerate from ESPN" : "Generate from ESPN"}</button>
            </form>
          </div>
        </section>
        {issue && (
          <>
            <h1 className="mt-8 mb-8 max-w-[14ch] font-display text-[clamp(2.5rem,9vw,4rem)] font-bold leading-[0.95]">
              {issue.headline}
            </h1>
            <Scoreboard facts={issue.facts} />
            <article className="mt-6">
              <IssueBody markdown={issue.markdown} />
            </article>
            <Standings facts={issue.facts} />
          </>
        )}
      </main>
    </>
  );
}
