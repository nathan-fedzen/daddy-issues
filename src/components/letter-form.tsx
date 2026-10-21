"use client";

import { useActionState } from "react";
import { postLetter, type LetterState } from "@/app/letters/actions";
import { LETTER_MAX, NAME_MAX } from "@/lib/letter-limits";

const field = "block w-full border-2 border-ink bg-paper px-3 py-2 text-base";
const label = "block pb-1 text-sm font-medium text-steel";

export function LetterForm({ week }: { week: number }) {
  const [state, action, pending] = useActionState<LetterState, FormData>(postLetter, { status: "idle", message: "" });
  if (state.status === "sent") {
    return (
      <p className="border-2 border-ink p-4 font-semibold" role="status">
        {state.message}
      </p>
    );
  }
  return (
    <form action={action} className="border-2 border-ink p-4">
      <input type="hidden" name="week" value={week} />
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="letter-name" className={label}>
            From
          </label>
          <input id="letter-name" name="name" className={field} maxLength={NAME_MAX} autoComplete="name" required />
        </div>
        <div>
          <label htmlFor="letter-pass" className={label}>
            League passcode
          </label>
          <input id="letter-pass" name="passcode" className={field} type="password" autoComplete="off" required />
        </div>
        <div className="sm:col-span-2">
          <label htmlFor="letter-body" className={label}>
            Your letter, {LETTER_MAX} characters or fewer
          </label>
          <textarea id="letter-body" name="body" className={`${field} min-h-32`} maxLength={LETTER_MAX} required />
        </div>
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-4">
        <button
          type="submit"
          disabled={pending}
          className="border-2 border-ink bg-ink px-4 py-2 font-display text-lg font-bold text-paper hover:bg-orange hover:border-orange disabled:opacity-60"
        >
          {pending ? "Sending" : "Send it"}
        </button>
        {state.status === "error" && (
          <p className="text-sm font-semibold text-orange" role="alert">
            {state.message}
          </p>
        )}
      </div>
    </form>
  );
}
