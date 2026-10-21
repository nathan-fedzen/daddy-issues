import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { league } from "@/config/league";
import { IssuePage } from "@/components/issue-page";
import { publishedIssue, publishedIssues } from "@/lib/issues/queries";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: PageProps<"/week/[week]">): Promise<Metadata> {
  const { week } = await params;
  const issue = Number.isInteger(Number(week)) ? await publishedIssue(Number(week)) : null;
  if (!issue) return {};
  return {
    title: `${issue.headline} | ${league.newsletter.name}`,
    description: `Week ${issue.week}. ${league.newsletter.tagline}.`,
  };
}

export default async function WeekPage({ params }: PageProps<"/week/[week]">) {
  const { week } = await params;
  const n = Number(week);
  if (!Number.isInteger(n) || n < 1) notFound();
  const [issue, archive] = await Promise.all([publishedIssue(n), publishedIssues()]);
  if (!issue) notFound();
  return <IssuePage issue={issue} archive={archive} />;
}
