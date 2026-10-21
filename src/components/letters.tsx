import { letterStoreFromEnv } from "@/lib/letters";
import { LetterForm } from "./letter-form";

const when = new Intl.DateTimeFormat("en-US", {
  weekday: "short",
  month: "short",
  day: "numeric",
  timeZone: "America/Denver",
});

export async function Letters({ season, week }: { season: number; week: number }) {
  const letters = await letterStoreFromEnv().list(season, week);
  return (
    <section aria-label="Letters to the editor" id="letters" className="mt-14">
      <h2 className="section-head">Letters to the editor</h2>
      <p className="max-w-[36rem]">
        Got roasted and have a case? One letter each. Everything sent this week goes to the editor for next
        week&apos;s issue, where it will be answered.
      </p>
      {letters.length > 0 && (
        <ol className="mt-6 divide-y divide-mist border-y border-mist">
          {letters.map((l) => (
            <li key={l.postedAt} className="py-4">
              <p className="max-w-[36rem] whitespace-pre-line">{l.body}</p>
              <p className="mt-2 text-sm">
                <span className="font-semibold">{l.name}</span>
                <span className="text-steel">, {when.format(new Date(l.postedAt))}</span>
              </p>
            </li>
          ))}
        </ol>
      )}
      <div className="mt-6">
        <LetterForm week={week} />
      </div>
    </section>
  );
}
