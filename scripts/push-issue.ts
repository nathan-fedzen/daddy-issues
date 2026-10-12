import { league } from "@/config/league";
import { BlobIssueStore, FileIssueStore } from "@/lib/issues/store";

// Copies a locally generated issue into the Vercel Blob store.
// Usage: npm run push -- --week 4 [--publish]
const args = process.argv.slice(2);
const weekArg = args[args.indexOf("--week") + 1];
const week = Number(weekArg);
if (!args.includes("--week") || !Number.isInteger(week)) throw new Error("usage: --week <n> [--publish]");
if (!process.env.BLOB_READ_WRITE_TOKEN) throw new Error("BLOB_READ_WRITE_TOKEN is not set in .env.local");

async function main() {
  const local = await new FileIssueStore().get(league.season, week);
  if (!local) throw new Error(`No local issue for week ${week} in data/issues`);
  const publish = args.includes("--publish");
  const issue = publish
    ? { ...local, status: "published" as const, publishedAt: local.publishedAt ?? new Date().toISOString() }
    : local;
  await new BlobIssueStore().put(issue);
  console.log(`Pushed week ${week} to Blob as ${issue.status}: ${issue.headline}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
