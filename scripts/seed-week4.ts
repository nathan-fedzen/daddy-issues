import { readFileSync } from "node:fs";
import type { LeagueSnapshot } from "@/lib/model";
import { buildFacts } from "@/lib/facts";
import { splitHeadline } from "@/lib/writer/writer";
import { storeFromEnv, type Issue } from "@/lib/issues/store";

// Seeds the inaugural issue. The prose was written by hand against the
// week 4 fixture so the site has a real issue before the ESPN cookies and
// writer key exist. Every number in it matches data/fixtures/2026-week-04.
const GENERATED_AT = "2026-10-09T22:30:00.000Z";

const markdown = `# Somebody Check On The Flamming Bills

## Fourteen teams played. Nine set a lineup.

Welcome to the first issue. This exists because the group chat was not holding anyone accountable, and accountability is a public service. Each week this will read the box scores so you do not have to, then explain what you did wrong in front of everyone you know. Nathan runs it, Nathan's team is in it, and Nathan's team will get it worse than yours. Starting now.

## The scoreboard

**Etienne My Ass 142.18, The Flamming Bills 89.26.** Blowout of the week, by 52.92, and it was self-inflicted. The Bills benched Drake Maye, who put up 26.16, and started Bo Nix for 13.56. They benched Brian Robinson Jr., who scored three touchdowns for 25.7, and started Blake Corum for 3.1. That is 43 points left in the garage, the most in the league. The perfect lineup still loses by ten. Somehow that is worse.

**Balls Deep 104.90, Please Touchdown There 103.24.** Decided by 1.66. Please Touchdown There picked up Kendre Miller on Wednesday night, started him at FLEX on Sunday, and got 1.9 points. Their entire bench produced 1.8. Here is the part that will keep them up: the lineup was optimal. Zero points left on the bench. They played it perfectly and lost to the lowest winning score of the week. Balls Deep's 104.9 would have beaten four other teams. They got the one that mattered.

**Kicking Feeld Holes 111.90, Kupp the Ballers 107.42.** Kupp left Nico Collins and his 30.8 on the bench to start Parker Washington for 2. They lost by 4.48. That single swap was worth 28.8 and the game. Kupp has the third most points in the league and a 2-2 record, which is the fantasy football equivalent of being handsome and single. Feeld Holes, meanwhile, made seven transactions in seven days, started Rashee Rice for zero, and won anyway. Chaos is a strategy if you commit.

**Gettin' D*cker'd 155.88, Himbo Hiker Material 125.18.** The high score of the week, built on Tetairoa McMillan going for 45.2. Himbo scored enough to beat nine other teams and drew the one team they could not. They also benched Rome Odunze and his 15.4 for DJ Moore's 2.7, dropped Travis Hunter last week to pick up the Jets defense, watched the Jets defense score zero, and then added the Patriots defense on Saturday. That is three defenses in four days. This is a cry for help.

**Burreauxkback Mountain 137.94, Burrowhead 125.72.** Burreauxkback is 4-0. They started Marcus Mariota at quarterback on purpose, got 5.34 out of him, won by 12 behind CeeDee Lamb's 41.3, and then cut Mariota on Tuesday like the whole thing never happened. Burrowhead scored more than ten of the other thirteen teams and lost. They also had T.J. Hockenson's 24.9 on the bench behind Travis Kelce's 3.5. Swap those and they win. They did not swap those.

**Nathan 124.08, Blowin' in the Snow 97.62.** Kyren Williams went for 36.7 and Nathan's team got a free win out of it, because the rest of the lineup included TreVeyon Henderson at 4.2 with Ollie Gordon II scoring 18 on the bench. That is 21.3 points left behind by a team that is seventh in the standings and eleventh in points. The Snow lost their first game of the year with DK Metcalf's 16.5 sitting behind Emeka Egbuka's 3.3 and a Chiefs defense that produced a single point.

**Gritty Glitter 109.88, Just Joshin' Around 78.42.** The low score of the week. Just Joshin' started Ladd McConkey at FLEX for zero points, had Keaton Mitchell's 11.3 on the bench, and would have lost even with the best possible lineup, which tops out at 98.26. Their best player was Josh Allen at 18.52. Three straight losses now. Gritty won with Kenneth Walker III's 30.9, benched RJ Harvey's 19.3, and then traded RJ Harvey to Nathan on Tuesday. We will come back to that.

## Points left on the bench

The Flamming Bills lead the league with 43 points stranded, which is a number that usually takes two bad weeks to reach. The two that actually cost a game belong to Kupp the Ballers, 28.8 on the Collins for Washington decision, and Burrowhead, 21.4 on Hockenson for Kelce. Both of those teams win with one drag and drop. This tally runs all season. Nobody wants to lead it in December.

## Luck

Unluckiest loss: Burrowhead, 125.72, better than ten of the thirteen other scores on the board. Himbo Hiker Material is right behind at 125.18 and nine. Luckiest win: Balls Deep at 104.9, a score that beats four teams and happened to be scheduled against one of them.

Season-wide, Kupp the Ballers sit sixth in the standings with the third most points. Gritty Glitter are eighth with the twelfth most. Nathan is seventh with the eleventh most. Two of those three are going to regress and one of them is going to complain about it.

## The wire

Twenty-eight moves in seven days. Kicking Feeld Holes made seven of them. They dropped Mark Andrews on Friday and picked Mark Andrews back up on Tuesday. They dropped Mike Washington Jr. on Tuesday to claim Will Shipley, picked Mike Washington Jr. back up on Wednesday, and traded Will Shipley to Just Joshin' Around on Thursday for Keaton Mitchell. Shipley was on the roster for about 52 hours. Grade for Feeld Holes: a backup for a backup, plus a bench spot that has now been a revolving door. Grade for Just Joshin': you are 1-3, this is not the move.

The other trade sent RJ Harvey to Nathan for Wan'Dale Robinson. Gritty Glitter had Harvey on the bench for 19.3 the week they traded him, so either they knew something or they did not look. Nathan gets a running back he will start over TreVeyon Henderson, which was already a low bar. We revisit this in four weeks with receipts.

Five teams swapped defenses this week: Gritty Glitter to the Cowboys, Himbo to the Patriots, Nathan to the Jaguars, Blowin' in the Snow to the Commanders, Burrowhead to the 49ers. Etienne My Ass picked up Kirk Cousins, which is a sentence that has been written every September for a decade. Balls Deep added Joe Mixon.

## Playoff picture

Eight of fourteen get in. Burreauxkback Mountain is at 99 percent and can start planning the parade. Blowin' in the Snow at 97, Kicking Feeld Holes at 94, Burrowhead at 88, and Kupp the Ballers at 85 are comfortable. Gettin' D*cker'd at 79 should be comfortable and will not act like it.

Then the drop. Nathan at 48, Gritty Glitter at 43, Just Joshin' at 40, Etienne at 36, Himbo at 32, the Flamming Bills at 31. That is six teams for two spots, and every one of them has ten games to turn a coin flip into a complaint about the schedule.

Balls Deep at 20 percent and Please Touchdown There at 9 are mathematically alive and spiritually dead. Please Touchdown There has the fewest points in the league and just lost by 1.66 with a perfect lineup. The universe has made its position clear.

## Next week

- Kicking Feeld Holes against The Flamming Bills. Seven moves against forty-three bench points. Entropy against entropy.
- Himbo Hiker Material against Balls Deep. Two 1-3 teams. Someone leaves with hope they have not earned.
- Burreauxkback Mountain against Etienne My Ass. The undefeated team against the team that just scored 142. The first real test, assuming Mariota stays cut.
- Please Touchdown There against Burrowhead. The unluckiest team against the saddest one. Burrowhead by twenty, unless Kelce starts again.
- Just Joshin' Around against Gettin' D*cker'd. The low score of the week against the high score. Set your lineup, Josh. Check the FLEX twice.
- Gritty Glitter against Nathan. The two sides of the RJ Harvey trade, one week later, on the same field. Whoever loses was wrong.
- Blowin' in the Snow against Kupp the Ballers. Kupp has the points. The Snow has the record. One of those is about to matter.
`;

async function main() {
  const snapshot = JSON.parse(
    readFileSync("data/fixtures/2026-week-04.snapshot.json", "utf8"),
  ) as LeagueSnapshot;
  const facts = buildFacts(snapshot, new Date(GENERATED_AT));
  const draft = splitHeadline(markdown, "hand-written");
  const issue: Issue = {
    season: snapshot.season,
    week: snapshot.week,
    status: "published",
    headline: draft.headline,
    markdown: draft.markdown,
    source: draft.markdown,
    facts,
    model: draft.model,
    generatedAt: GENERATED_AT,
    publishedAt: GENERATED_AT,
  };
  await storeFromEnv().put(issue);
  console.log(`Seeded week ${issue.week}: ${issue.headline}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
