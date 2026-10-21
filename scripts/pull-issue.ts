import { league } from "@/config/league";
import { BlobIssueStore, FileIssueStore } from "@/lib/issues/store";

// Copies issues from the Vercel Blob store into data/issues for local work.
// Usage: npm run pull -- --week 5   |   npm run pull -- --all
const args = process.argv.slice(2);
const week = Number(args[args.indexOf("--week") + 1]);
const all = args.includes("--all");
if (!all && (!args.includes("--week") || !Number.isInteger(week))) throw new Error("usage: --week <n> | --all");
if (!process.env.BLOB_READ_WRITE_TOKEN) throw new Error("BLOB_READ_WRITE_TOKEN is not set in .env.local");

async function main() {
  const blob = new BlobIssueStore();
  const local = new FileIssueStore();
  const weeks = all ? (await blob.list(league.season)).map((s) => s.week) : [week];
  for (const w of weeks) {
    const issue = await blob.get(league.season, w);
    if (!issue) throw new Error(`No issue for week ${w} in Blob`);
    await local.put(issue);
    console.log(`Pulled week ${w} (${issue.status}): ${issue.headline}`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
