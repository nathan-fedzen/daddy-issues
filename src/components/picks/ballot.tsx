"use client";

import { useActionState, useState } from "react";
import { submitPicks, type PickState } from "@/app/picks/actions";

export interface BallotSide {
  teamId: string;
  owner: string;
  teamName: string;
  record: string;
}

export interface BallotGame {
  key: string;
  home: BallotSide;
  away: BallotSide;
}

export interface BallotVoter {
  teamId: string;
  owner: string;
  locked: boolean;
}

interface Props {
  week: number;
  games: BallotGame[];
  voters: BallotVoter[];
  lockAt: string;
}

function SideButton({ side, chosen, onPick }: { side: BallotSide; chosen: boolean; onPick: () => void }) {
  return (
    <button
      type="button"
      aria-pressed={chosen}
      onClick={onPick}
      className={`min-w-0 border-2 border-ink px-3 py-3 text-left ${
        chosen ? "bg-ink text-paper" : "bg-paper hover:bg-mist"
      }`}
    >
      <span className="block truncate font-display text-2xl font-bold leading-none">{side.owner}</span>
      <span className={`mt-1.5 block truncate text-xs font-medium ${chosen ? "text-paper/70" : "text-steel"}`}>
        {side.teamName !== side.owner && `${side.teamName}, `}
        {side.record}
      </span>
    </button>
  );
}

export function Ballot({ week, games, voters, lockAt }: Props) {
  const [picks, setPicks] = useState<Record<string, string>>({});
  const [voter, setVoter] = useState("");
  const [state, action, pending] = useActionState<PickState, FormData>(submitPicks, { status: "idle", message: "" });

  if (state.status === "sent") {
    return (
      <p className="mt-8 border-2 border-ink p-4 font-semibold" role="status">
        {state.message}
      </p>
    );
  }

  const picked = games.filter((g) => picks[g.key]).length;
  const complete = picked === games.length && voter !== "";

  return (
    <form action={action} className="mt-2">
      <input type="hidden" name="week" value={week} />
      <input type="hidden" name="voter" value={voter} />
      {games.map((g) => (
        <input key={g.key} type="hidden" name={`pick:${g.key}`} value={picks[g.key] ?? ""} />
      ))}

      <h2 className="section-head">The slate</h2>
      <p className="max-w-[36rem]">
        Tap the winner in every game. One ballot each, no edits, and nobody sees anyone else&apos;s until it locks{" "}
        {lockAt}.
      </p>
      <ol className="mt-6">
        {games.map((g) => (
          <li key={g.key} className="border-t border-mist py-2 first:border-t-0">
            <div className="grid grid-cols-2 gap-2" role="group" aria-label={`${g.home.owner} against ${g.away.owner}`}>
              <SideButton
                side={g.home}
                chosen={picks[g.key] === g.home.teamId}
                onPick={() => setPicks({ ...picks, [g.key]: g.home.teamId })}
              />
              <SideButton
                side={g.away}
                chosen={picks[g.key] === g.away.teamId}
                onPick={() => setPicks({ ...picks, [g.key]: g.away.teamId })}
              />
            </div>
          </li>
        ))}
      </ol>

      <h2 className="section-head">Who&apos;s picking</h2>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {voters.map((v) => (
          <button
            key={v.teamId}
            type="button"
            disabled={v.locked}
            aria-pressed={voter === v.teamId}
            onClick={() => setVoter(v.teamId)}
            className={`border-2 px-3 py-2 text-left font-semibold ${
              v.locked
                ? "border-mist text-steel"
                : voter === v.teamId
                  ? "border-ink bg-ink text-paper"
                  : "border-ink bg-paper hover:bg-mist"
            }`}
          >
            <span className={v.locked ? "line-through" : ""}>{v.owner}</span>
            {v.locked && <span className="block text-xs font-medium">locked in</span>}
          </button>
        ))}
      </div>

      <div className="mt-8 grid items-end gap-4 sm:grid-cols-[1fr_auto]">
        <div>
          <label htmlFor="picks-pass" className="block pb-1 text-sm font-medium text-steel">
            League passcode
          </label>
          <input
            id="picks-pass"
            name="passcode"
            type="password"
            autoComplete="off"
            required
            className="block w-full border-2 border-ink bg-paper px-3 py-2 text-base"
          />
        </div>
        <button
          type="submit"
          disabled={pending || !complete}
          className="border-2 border-ink bg-ink px-4 py-2.5 font-display text-lg font-bold text-paper hover:border-orange hover:bg-orange disabled:cursor-not-allowed disabled:opacity-50"
        >
          {pending ? "Locking in" : complete ? "Lock in my picks" : `${picked} of ${games.length} picked`}
        </button>
      </div>
      {state.status === "error" && (
        <p className="mt-3 text-sm font-semibold text-orange" role="alert">
          {state.message}
        </p>
      )}
    </form>
  );
}
