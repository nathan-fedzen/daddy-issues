"use server";

import { updateTag } from "next/cache";
import { league } from "@/config/league";
import { passcodeValid } from "@/lib/letters";
import { gameKey } from "@/lib/picks/board";
import { fetchSlate } from "@/lib/picks/live";
import { PICKS_TAG, PickExistsError, pickStoreFromEnv, validateSheet } from "@/lib/picks/store";
import { lockLabel, pickWindow } from "@/lib/picks/time";

export interface PickState {
  status: "idle" | "sent" | "error";
  message: string;
}

const error = (message: string): PickState => ({ status: "error", message });

export async function submitPicks(_prev: PickState, formData: FormData): Promise<PickState> {
  const week = Number(formData.get("week"));
  const window = pickWindow();
  if (week !== window.week) return error(`That slate isn't open. This week is week ${window.week}.`);
  if (!window.open) return error(`Week ${week} picks locked ${lockLabel(window.lockAt)}.`);
  if (!passcodeValid(formData.get("passcode"))) return error("Wrong passcode.");

  const slate = await fetchSlate(week);
  const games = slate.games
    .filter((g) => g.week === week)
    .map((g) => ({ key: gameKey(g), homeId: g.homeId, awayId: g.awayId }));
  const picks = Object.fromEntries(games.map((g) => [g.key, formData.get(`pick:${g.key}`)]));
  const checked = validateSheet({ teamId: formData.get("voter"), picks }, games);
  if (!checked.ok) return error(checked.error);

  try {
    await pickStoreFromEnv().add({
      season: league.season,
      week,
      teamId: checked.teamId,
      owner: checked.owner,
      picks: checked.picks,
      submittedAt: new Date().toISOString(),
    });
  } catch (err) {
    if (err instanceof PickExistsError) return error(err.message);
    throw err;
  }
  updateTag(PICKS_TAG);
  return {
    status: "sent",
    message: `Locked in. ${checked.owner}, ${games.length} picks. Everyone's picks go up ${lockLabel(window.lockAt)}.`,
  };
}
