import { league } from "@/config/league";
import { gameKey } from "@/lib/picks/board";
import { loadSlate } from "@/lib/picks/live";
import { FilePickStore, PickExistsError } from "@/lib/picks/store";

// Usage:
//   npm run seed:picks -- --week 9             sample ballots for 11 owners into data/picks
//   npm run seed:picks -- --week 9 --voters 14
// Local demo data only; it always writes to data/picks, never to Blob.
const args = process.argv.slice(2);
const flag = (name: string) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? (args[i + 1] ?? "") : undefined;
};

async function main() {
  const week = Number(flag("week"));
  if (!Number.isInteger(week) || week < 1) throw new Error("--week N is required");
  const count = Number(flag("voters") ?? 11);
  const slate = await loadSlate(week);
  const games = slate.games.filter((g) => g.week === week);
  if (games.length === 0) throw new Error(`No games for week ${week}`);

  let seed = week * 7919 + 17;
  const rand = () => {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    return seed / 0x7fffffff;
  };
  const store = new FilePickStore();
  const owners = Object.entries(league.teams)
    .map(([teamId, t]) => ({ teamId, owner: t.owner.trim() || `Team ${teamId}` }))
    .sort((a, b) => a.owner.localeCompare(b.owner))
    .slice(0, count);

  for (const [i, o] of owners.entries()) {
    const picks = Object.fromEntries(games.map((g) => [gameKey(g), rand() < 0.55 ? g.homeId : g.awayId]));
    try {
      await store.add({
        season: league.season,
        week,
        teamId: o.teamId,
        owner: o.owner,
        picks,
        submittedAt: new Date(Date.UTC(2026, 10, 3, 18, 0, i)).toISOString(),
      });
      console.log(`seeded ${o.owner}`);
    } catch (err) {
      if (err instanceof PickExistsError) console.log(`kept ${o.owner} (already in)`);
      else throw err;
    }
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
