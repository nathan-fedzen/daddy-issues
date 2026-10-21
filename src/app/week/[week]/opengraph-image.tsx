import { league } from "@/config/league";
import { publishedIssue } from "@/lib/issues/queries";
import { issueCard, OG_SIZE } from "@/lib/og";

export const dynamic = "force-dynamic";
export const alt = league.newsletter.name;
export const size = OG_SIZE;
export const contentType = "image/png";

export default async function Image({ params }: { params: Promise<{ week: string }> }) {
  const { week } = await params;
  const n = Number(week);
  return issueCard(Number.isInteger(n) ? await publishedIssue(n) : null);
}
