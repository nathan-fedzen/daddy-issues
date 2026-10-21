"use server";

import { league } from "@/config/league";
import { alreadyWrote, letterStoreFromEnv, passcodeValid, validateLetter } from "@/lib/letters";

export interface LetterState {
  status: "idle" | "sent" | "error";
  message: string;
}

export async function postLetter(_prev: LetterState, formData: FormData): Promise<LetterState> {
  const week = Number(formData.get("week"));
  if (!Number.isInteger(week) || week < 1 || week > 18) return { status: "error", message: "No such week." };
  if (!passcodeValid(formData.get("passcode"))) return { status: "error", message: "Wrong passcode." };
  const checked = validateLetter({ name: formData.get("name"), body: formData.get("body") });
  if (!checked.ok) return { status: "error", message: checked.error };

  const store = letterStoreFromEnv();
  const existing = await store.list(league.season, week);
  if (alreadyWrote(existing, checked.name)) {
    return { status: "error", message: `The editor already has a letter from ${checked.name} this week. One each.` };
  }
  await store.add({
    season: league.season,
    week,
    name: checked.name,
    body: checked.body,
    postedAt: new Date().toISOString(),
  });
  return { status: "sent", message: "Received. The editor will respond next week, probably badly." };
}
