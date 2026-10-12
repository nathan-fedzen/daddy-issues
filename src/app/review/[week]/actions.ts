"use server";

import { redirect } from "next/navigation";
import { league } from "@/config/league";
import { generateIssue, publishIssue } from "@/lib/pipeline";
import { reviewKeyValid } from "@/lib/review-key";

function back(week: number, key: string, status: string): never {
  redirect(`/review/${week}?key=${encodeURIComponent(key)}&status=${encodeURIComponent(status)}`);
}

export async function publishAction(formData: FormData): Promise<void> {
  const key = String(formData.get("key") ?? "");
  const week = Number(formData.get("week"));
  if (!reviewKeyValid(key)) redirect("/");
  const issue = await publishIssue(league.season, week);
  back(week, key, issue ? "published" : "missing");
}

export async function regenerateAction(formData: FormData): Promise<void> {
  const key = String(formData.get("key") ?? "");
  const week = Number(formData.get("week"));
  if (!reviewKeyValid(key)) redirect("/");
  let status = "regenerated";
  try {
    await generateIssue({ week, publish: false, overwritePublished: true });
  } catch (err) {
    status = `error: ${err instanceof Error ? err.message : String(err)}`;
  }
  back(week, key, status);
}
