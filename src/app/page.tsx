import { Masthead } from "@/components/masthead";
import { IssuePage } from "@/components/issue-page";
import { latestPublished, publishedIssues } from "@/lib/issues/queries";

export const dynamic = "force-dynamic";

export default async function Home() {
  const [issue, archive] = await Promise.all([latestPublished(), publishedIssues()]);
  if (!issue) {
    return (
      <>
        <Masthead />
        <main className="mx-auto max-w-[42rem] px-5 py-16">
          <h1 className="font-display text-5xl font-bold leading-none">Nothing to read yet.</h1>
          <p className="mt-4 max-w-[36rem]">
            The first issue lands the Tuesday after a full week of games. Set your lineup and
            prepare to be discussed.
          </p>
        </main>
      </>
    );
  }
  return <IssuePage issue={issue} archive={archive} />;
}
