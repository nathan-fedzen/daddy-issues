import { NextResponse } from "next/server";
import { generateIssue } from "@/lib/pipeline";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const week = new URL(request.url).searchParams.get("week");
  try {
    const issue = await generateIssue({ week: week ? Number(week) : undefined });
    return NextResponse.json({
      week: issue.week,
      status: issue.status,
      headline: issue.headline,
      model: issue.model,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
