import { notFound } from "next/navigation";
import { IssuePage } from "@/components/issue-page";
import { publishedIssue, publishedIssues } from "@/lib/issues/queries";

export const dynamic = "force-dynamic";

export default async function WeekPage({ params }: PageProps<"/week/[week]">) {
  const { week } = await params;
  const n = Number(week);
  if (!Number.isInteger(n) || n < 1) notFound();
  const [issue, archive] = await Promise.all([publishedIssue(n), publishedIssues()]);
  if (!issue) notFound();
  return <IssuePage issue={issue} archive={archive} />;
}
