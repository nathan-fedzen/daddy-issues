export interface TeamBible {
  owner: string;
  lore?: string;
}

export interface LeagueConfig {
  espnLeagueId: string;
  season: number;
  newsletter: { name: string; tagline: string };
  heat: 1 | 2 | 3 | 4 | 5;
  commissionerTeamId?: string;
  teams: Record<string, TeamBible>;
  rivalries: string[];
  runningBits: string[];
  offLimits: string[];
}

// Fill in owners and lore here. Empty owner strings fall back to the team name.
export const league: LeagueConfig = {
  espnLeagueId: "470726400",
  season: 2026,
  newsletter: {
    name: "Daddy Issues",
    tagline: "The weekly roast of Mile High Daddy and Subs Fantasy",
  },
  heat: 4,
  teams: {
    "1": { 
      owner: "Rudy",
      lore: "He is the commissioner, have no mercy on him"
     },
    "3": { owner: "William" },
    "4": { owner: "Culley" },
    "5": {
      owner: "Dan",
      lore: "Struggling, and has started talking about handing his team to an AI (Muse AI) for the rest of the season. Treat every lineup decision as evidence for or against the robot.",
    },
    "6": { owner: "Wyatt" },
    "7": {
      owner: "DJ",
      lore: "The league villain. Everyone roots against him and Nathan bullies him in the group chat weekly. His wins are suspicious, his losses are a public holiday.",
    },
    "8": { owner: "Zac" },
    "9": { owner: "Daniel" },
    "10": { owner: "Marcellus" },
    "11": {
      owner: "Tanner",
      lore: "Soon to be engaged to Rudy, the commissioner. This is sanctioned material: any ruling, waiver, or trade that goes Tanner's way is favoritism until proven otherwise.",
    },
    "12": {
      owner: "Nathan",
      lore: "Runs the newsletter. Gets roasted hardest so nobody can call it rigged.",
    },
    "13": { owner: "Sean" },
    "14": { owner: "Cheston" },
    "15": { owner: "Joe" },
  },
  rivalries: [
    "Nathan vs DJ: Nathan wants DJ to lose every week and says so. When they play each other it is the main event.",
  ],
  runningBits: [
    "Rooting against DJ is a league-wide pastime. Check in on it every issue, win or lose.",
    "Dan and the robot: is Muse AI running his team yet, and would it have done better?",
    "Commissioner favoritism: Rudy and Tanner. Any week Tanner benefits from anything, note it with suspicion.",
    "Rudy is the commissioner and gets no mercy for it.",
    "League rule: start a player who scores exactly 0 and you owe the group chat a video of yourself chugging a beer shirtless. Every zero-point starter gets named, and the owner gets reminded what they owe.",
  ],
  offLimits: [
    "Real-life jobs, money, health, family, or appearance. The Rudy and Tanner engagement is the one sanctioned exception, and only as a favoritism joke.",
    "Anything that is not about fantasy football decisions, rosters, results, or team names",
  ],
};

export function ownerName(teamId: string, fallback: string): string {
  return league.teams[teamId]?.owner?.trim() || fallback.trim();
}
