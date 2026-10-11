// One-off: converts a saved League Loom week-4 matchups dump plus the
// hand-transcribed seventh matchup, schedule, standings and transactions into
// a LeagueSnapshot fixture. The ESPN client replaces this once cookies exist.
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";

const src = process.argv[2];
if (!src) throw new Error("usage: node scripts/build-fixture-week4.mjs <leagueloom-week4.json>");
const loom = JSON.parse(readFileSync(src, "utf8"));

const line = (id, name, position, proTeam, slot, points, projected) => ({
  playerId: String(id), name, position, proTeam, slot, points, projected, injury: "ACTIVE",
});

const loomSide = (s) => ({
  teamId: s.teamId,
  points: s.points,
  lineup: (s.players ?? []).map((p) =>
    line(p.playerId, p.name, p.position, p.proTeam, p.slot, p.points, p.projectedPoints ?? 0),
  ),
});

const matchups = loom.matchups
  .filter((m) => (m.home.players?.length ?? 0) > 0)
  .map((m) => ({ week: 4, home: loomSide(m.home), away: loomSide(m.away) }));

matchups.push({
  week: 4,
  home: {
    teamId: "8",
    points: 142.18,
    lineup: [
      line(4685382, "Omarion Hampton", "RB", "LAC", "RB", 13.3, 10.74),
      line(4362238, "Chase Brown", "RB", "CIN", "RB", 19.1, 16.2),
      line(4429615, "Zay Flowers", "WR", "BAL", "WR", 25.8, 15.48),
      line(4723086, "Colston Loveland", "TE", "CHI", "TE", 11.7, 8.66),
      line(4685278, "Luther Burden III", "WR", "CHI", "WR", 11.4, 12.43),
      line(4035687, "Michael Pittman Jr.", "WR", "PIT", "BE", 3.5, 9.72),
      line(3042519, "Aaron Jones Sr.", "RB", "MIN", "FLEX", 16.8, 18.02),
      line(2971573, "Ka'imi Fairbairn", "K", "HOU", "K", 16, 9.85),
      line(4361432, "Romeo Doubs", "WR", "NE", "BE", 23.8, 9.77),
      line(-16023, "Steelers D/ST", "D/ST", "PIT", "D/ST", 5, 8.46),
      line(4241463, "Jerry Jeudy", "WR", "CLE", "BE", 6.6, 4.59),
      line(4869645, "Caleb Douglas", "WR", "MIA", "BE", 0, 0),
      line(4432577, "C.J. Stroud", "QB", "HOU", "QB", 23.08, 16.82),
      line(3915411, "Ty Johnson", "RB", "BUF", "BE", 3.2, 4.46),
      line(3916433, "Jakobi Meyers", "WR", "JAX", "BE", 6.3, 10.79),
    ],
  },
  away: {
    teamId: "3",
    points: 89.26,
    lineup: [
      line(4374302, "Amon-Ra St. Brown", "WR", "DET", "WR", 15.5, 20.15),
      line(4890973, "Ashton Jeanty", "RB", "LV", "RB", 18.6, 18.87),
      line(4431452, "Drake Maye", "QB", "NE", "BE", 26.16, 17.5),
      line(4569618, "Garrett Wilson", "WR", "NYJ", "WR", 5.7, 16.47),
      line(4678008, "Jonathon Brooks", "RB", "CAR", "IR", 0, 0),
      line(5083076, "Harold Fannin Jr.", "TE", "CLE", "TE", 11.7, 11.11),
      line(4432773, "Brian Thomas Jr.", "WR", "JAX", "BE", 9.7, 8.21),
      line(4429096, "Blake Corum", "RB", "LAR", "RB", 3.1, 8.11),
      line(4429205, "Jordan Addison", "WR", "MIN", "FLEX", 9.1, 14.79),
      line(4426338, "Bo Nix", "QB", "DEN", "QB", 13.56, 15.09),
      line(4241474, "Brian Robinson Jr.", "RB", "ATL", "BE", 25.7, 6.06),
      line(4832800, "Denzel Boston", "WR", "CLE", "BE", 12.9, 10.55),
      line(3055899, "Harrison Butker", "K", "KC", "K", 6, 8.71),
      line(-16024, "Chargers D/ST", "D/ST", "LAC", "D/ST", 6, 4.23),
      line(4696044, "Kaelon Black", "RB", "SF", "BE", 1.3, 5.45),
      line(4239934, "AJ Dillon", "RB", "CAR", "BE", 1.7, 4.89),
    ],
  },
});

const T = {
  1: "Kicking Feeld Holes", 3: "The Flamming Bills", 4: "Just Joshin’ Around", 5: "Gritty Glitter",
  6: "Blowin' in the Snow", 7: "Burrowhead", 8: "Etienne My Ass", 9: "Kupp the Ballers",
  10: "Gettin' D*cker'd", 11: "Himbo Hiker Material", 12: "Outwit, Outplay, Outbottom",
  13: "Balls Deep", 14: "Burreauxkback Mountain", 15: "Please Touchdown There",
};
const rec = {
  14: [4, 0, 522.72, 396.62], 6: [3, 1, 518.24, 427.18], 1: [3, 1, 487.72, 465.44], 7: [3, 1, 459.54, 443.52],
  10: [3, 1, 451.18, 407.14], 9: [2, 2, 487.96, 398.26], 12: [2, 2, 414.62, 422.32], 5: [2, 2, 405.34, 398.72],
  4: [1, 3, 437.16, 506.7], 8: [1, 3, 434.96, 464.04], 3: [1, 3, 430.06, 497.78], 11: [1, 3, 429.18, 508.08],
  13: [1, 3, 404.9, 484.06], 15: [1, 3, 375.64, 439.36],
};
const teams = Object.entries(T).map(([id, name]) => {
  const [wins, losses, pointsFor, pointsAgainst] = rec[id];
  return { id, name, abbrev: name.slice(0, 4).toUpperCase(), wins, losses, ties: 0, pointsFor, pointsAgainst };
});

const g = (week, h, a, hp = 0, ap = 0) => ({
  week, homeId: String(h), awayId: String(a), homePoints: hp, awayPoints: ap, final: hp + ap > 0,
});
const games = [
  g(1, 1, 5, 114.3, 133.62), g(1, 14, 15, 124.66, 89.76), g(1, 3, 11, 110.42, 127.46), g(1, 6, 10, 137.3, 110.32),
  g(1, 7, 12, 109.36, 88), g(1, 8, 4, 126, 149.76), g(1, 9, 13, 132.26, 84.3),
  g(2, 10, 15, 112.76, 74.44), g(2, 11, 14, 79.5, 133.58), g(2, 12, 8, 85.96, 75.1), g(2, 13, 3, 114.06, 122.02),
  g(2, 4, 1, 107.82, 121.28), g(2, 5, 6, 91.62, 133.78), g(2, 7, 9, 110.38, 109.22),
  g(3, 1, 12, 140.24, 116.58), g(3, 14, 13, 126.54, 101.64), g(3, 15, 11, 108.2, 97.04), g(3, 3, 7, 108.36, 114.08),
  g(3, 5, 10, 70.22, 72.22), g(3, 6, 4, 149.54, 101.16), g(3, 8, 9, 91.68, 139.06),
  g(4, 10, 11, 155.88, 125.18), g(4, 12, 6, 124.08, 97.62), g(4, 13, 15, 104.9, 103.24), g(4, 4, 5, 78.42, 109.88),
  g(4, 7, 14, 125.72, 137.94), g(4, 8, 3, 142.18, 89.26), g(4, 9, 1, 107.42, 111.9),
  g(5, 1, 3), g(5, 11, 13), g(5, 14, 8), g(5, 15, 7), g(5, 4, 10), g(5, 5, 12), g(5, 6, 9),
  g(6, 1, 14), g(6, 10, 13), g(6, 12, 4), g(6, 3, 6), g(6, 7, 11), g(6, 8, 15), g(6, 9, 5),
  g(7, 11, 8), g(7, 12, 10), g(7, 13, 7), g(7, 15, 1), g(7, 4, 9), g(7, 5, 3), g(7, 6, 14),
  g(8, 1, 11), g(8, 10, 7), g(8, 14, 5), g(8, 3, 4), g(8, 6, 15), g(8, 8, 13), g(8, 9, 12),
  g(9, 11, 6), g(9, 12, 3), g(9, 13, 1), g(9, 4, 14), g(9, 5, 15), g(9, 7, 8), g(9, 9, 10),
  g(10, 1, 7), g(10, 10, 8), g(10, 14, 12), g(10, 15, 4), g(10, 3, 9), g(10, 5, 11), g(10, 6, 13),
  g(11, 12, 15), g(11, 13, 5), g(11, 3, 10), g(11, 4, 11), g(11, 7, 6), g(11, 8, 1), g(11, 9, 14),
  g(12, 10, 1), g(12, 11, 12), g(12, 14, 3), g(12, 15, 9), g(12, 4, 13), g(12, 5, 7), g(12, 6, 8),
  g(13, 1, 6), g(13, 12, 13), g(13, 14, 10), g(13, 3, 15), g(13, 7, 4), g(13, 8, 5), g(13, 9, 11),
  g(14, 10, 6), g(14, 11, 3), g(14, 12, 7), g(14, 13, 9), g(14, 15, 14), g(14, 4, 8), g(14, 5, 1),
];

let n = 0;
const tx = (type, teamId, date, items) => ({
  id: `fixture-${++n}`, type, teamId: String(teamId), date, items,
});
const add = (id, name, pos, to) => ({ action: "ADD", playerId: String(id), playerName: name, position: pos, toTeamId: String(to) });
const drop = (id, name, pos, from) => ({ action: "DROP", playerId: String(id), playerName: name, position: pos, fromTeamId: String(from) });
const trade = (id, name, pos, from, to) => ({ action: "TRADE", playerId: String(id), playerName: name, position: pos, fromTeamId: String(from), toTeamId: String(to) });
const W = "2026-10-07T07:54:01.941Z";
const transactions = [
  tx("ADD", 10, "2026-10-09T18:36:55.535Z", [drop(2576925, "Darren Waller", "TE", 10), add(5081432, "Antonio Williams", "WR", 10)]),
  tx("TRADE", 4, "2026-10-09T12:14:50.630Z", [trade(4431545, "Will Shipley", "RB", 1, 4), trade(4596334, "Keaton Mitchell", "RB", 4, 1)]),
  tx("ADD", 1, "2026-10-08T22:15:44.350Z", [add(4686658, "Mike Washington Jr.", "RB", 1), drop(3117256, "Dalton Schultz", "TE", 1)]),
  tx("ADD", 15, "2026-10-08T16:56:21.356Z", [add(4715355, "Darius Cooper", "WR", 15), drop(3886598, "Jauan Jennings", "WR", 15)]),
  tx("ADD", 12, "2026-10-07T19:59:08.255Z", [drop(-16001, "Falcons D/ST", "D/ST", 12), add(-16030, "Jaguars D/ST", "D/ST", 12)]),
  tx("ADD", 5, "2026-10-07T14:25:37.694Z", [drop(-16002, "Bills D/ST", "D/ST", 5), add(-16006, "Cowboys D/ST", "D/ST", 5)]),
  tx("ADD", 14, "2026-10-07T13:17:57.592Z", [add(4819231, "Kaleb Johnson", "RB", 14), drop(2576980, "Marcus Mariota", "QB", 14)]),
  tx("ADD", 1, "2026-10-07T08:06:26.632Z", [add(3116365, "Mark Andrews", "TE", 1), drop(4682745, "Jaylen Wright", "RB", 1)]),
  tx("WAIVER", 1, W, [add(4571557, "Spencer Shrader", "K", 1), drop(3150744, "Chase McLaughlin", "K", 1)]),
  tx("WAIVER", 1, W, [drop(5083315, "Kenyon Sadiq", "TE", 1), add(8439, "Aaron Rodgers", "QB", 1)]),
  tx("WAIVER", 1, W, [add(4431545, "Will Shipley", "RB", 1), drop(4686658, "Mike Washington Jr.", "RB", 1)]),
  tx("WAIVER", 6, W, [drop(4586312, "Jaylin Noel", "WR", 6), add(-16028, "Commanders D/ST", "D/ST", 6)]),
  tx("WAIVER", 1, W, [add(4384852, "Dohnte Meyers", "WR", 1), drop(4869961, "Chris Bell", "WR", 1)]),
  tx("WAIVER", 9, W, [drop(4832955, "Emmett Johnson", "RB", 9), add(4697815, "Rachaad White", "RB", 9)]),
  tx("WAIVER", 12, W, [add(4870653, "KC Concepcion", "WR", 12), drop(3149687, "Chris Brooks", "RB", 12)]),
  tx("WAIVER", 5, W, [add(4431492, "Roman Wilson", "WR", 5), drop(4362249, "Jayden Reed", "WR", 5)]),
  tx("WAIVER", 4, W, [add(4635008, "Keon Coleman", "WR", 4), drop(4429025, "Quentin Johnston", "WR", 4)]),
  tx("WAIVER", 8, W, [add(14880, "Kirk Cousins", "QB", 8), drop(3915411, "Ty Johnson", "RB", 8)]),
  tx("WAIVER", 3, W, [add(4689936, "Jake Bates", "K", 3), drop(4239934, "AJ Dillon", "RB", 3)]),
  tx("WAIVER", 13, W, [add(3116385, "Joe Mixon", "RB", 13)]),
  tx("TRADE", 5, "2026-10-07T04:10:02.739Z", [trade(4569587, "Wan'Dale Robinson", "WR", 12, 5), trade(4568490, "RJ Harvey", "RB", 5, 12)]),
  tx("ADD", 7, "2026-10-04T11:50:41.058Z", [add(-16025, "49ers D/ST", "D/ST", 7), drop(4038441, "Justice Hill", "RB", 7)]),
  tx("ADD", 11, "2026-10-04T01:07:28.222Z", [add(-16017, "Patriots D/ST", "D/ST", 11)]),
  tx("DROP", 11, "2026-10-04T01:03:39.005Z", [drop(-16021, "Eagles D/ST", "D/ST", 11)]),
  tx("ADD", 11, "2026-10-04T01:02:26.535Z", [add(4429835, "George Holani", "RB", 11), drop(4241457, "Najee Harris", "RB", 11)]),
  tx("ADD", 1, "2026-10-03T21:52:54.662Z", [drop(3116365, "Mark Andrews", "TE", 1), add(4869961, "Chris Bell", "WR", 1)]),
  tx("ADD", 5, "2026-10-03T04:17:42.416Z", [add(4567104, "Will Reichard", "K", 5), drop(3050478, "Jake Elliott", "K", 5)]),
  tx("ADD", 14, "2026-10-03T00:53:53.356Z", [add(2576980, "Marcus Mariota", "QB", 14), drop(3116389, "Samaje Perine", "RB", 14)]),
  tx("ADD", 15, "2026-10-02T18:49:13.503Z", [add(3886598, "Jauan Jennings", "WR", 15), drop(4430834, "Jalen McMillan", "WR", 15)]),
  tx("ADD", 14, "2026-10-02T17:10:58.326Z", [add(3116406, "Tyreek Hill", "WR", 14), drop(4697815, "Rachaad White", "RB", 14)]),
  tx("ADD", 12, "2026-10-01T23:06:00.119Z", [add(-16001, "Falcons D/ST", "D/ST", 12), drop(-16029, "Panthers D/ST", "D/ST", 12)]),
  tx("ADD", 10, "2026-10-01T16:11:35.785Z", [add(4695404, "Isaiah Davis", "RB", 10), drop(4686728, "Gunnar Helm", "TE", 10)]),
  tx("ADD", 10, "2026-10-01T16:11:11.258Z", [drop(4570037, "Terrance Ferguson", "TE", 10), add(2576925, "Darren Waller", "TE", 10)]),
  tx("ADD", 10, "2026-10-01T16:10:38.194Z", [add(4373626, "Tyler Allgeier", "RB", 10), drop(4360516, "Tyrone Tracy Jr.", "RB", 10)]),
  tx("ADD", 10, "2026-10-01T16:07:20.247Z", [add(-16003, "Bears D/ST", "D/ST", 10), drop(-16025, "49ers D/ST", "D/ST", 10)]),
  tx("ADD", 1, "2026-10-01T12:39:52.074Z", [add(4686658, "Mike Washington Jr.", "RB", 1), drop(-16017, "Patriots D/ST", "D/ST", 1)]),
  tx("ADD", 11, "2026-10-01T03:32:15.918Z", [drop(4685415, "Travis Hunter", "WR", 11), add(-16020, "Jets D/ST", "D/ST", 11)]),
  tx("ADD", 15, "2026-10-01T02:41:04.673Z", [add(4599739, "Kendre Miller", "RB", 15)]),
  tx("ADD", 5, "2026-09-30T15:52:14.478Z", [drop(-16018, "Saints D/ST", "D/ST", 5), add(-16002, "Bills D/ST", "D/ST", 5)]),
  tx("ADD", 9, "2026-09-30T11:18:53.402Z", [drop(3924327, "Drew Lock", "QB", 9), add(2991662, "Mack Hollins", "WR", 9)]),
];

const snapshot = {
  season: 2026,
  week: 4,
  leagueName: "Mile High Daddy and Subs Fantasy",
  playoffTeams: 8,
  regularSeasonWeeks: 14,
  slots: { QB: 1, RB: 2, WR: 2, TE: 1, FLEX: 1, K: 1, "D/ST": 1 },
  teams,
  matchups,
  games,
  transactions,
  fetchedAt: "2026-10-09T22:10:00.000Z",
};

mkdirSync("data/fixtures", { recursive: true });
writeFileSync("data/fixtures/2026-week-04.snapshot.json", JSON.stringify(snapshot, null, 2));
console.log(`matchups ${matchups.length}, games ${games.length}, transactions ${transactions.length}`);
