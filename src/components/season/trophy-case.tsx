import { AWARD_BLURBS, AWARD_KEYS, awardName, type Shelf } from "@/lib/awards";

export function TrophyCase({ shelves }: { shelves: Shelf[] }) {
  if (shelves.length === 0) return null;
  return (
    <section aria-label="Trophy case" id="trophies" className="mt-14">
      <h2 className="section-head">The trophy case</h2>
      <p className="max-w-[36rem]">
        Every week hands out the same hardware. Most of it is not the kind you want.
      </p>
      <ol className="mt-6 divide-y divide-mist border-y border-mist">
        {shelves.map((s) => (
          <li key={s.teamId} className="py-3">
            <div className="flex items-baseline justify-between gap-4">
              <span className="font-semibold">{s.owner}</span>
              <span className="font-display text-2xl font-black leading-none nums">{s.total}</span>
            </div>
            <ul className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm">
              {s.trophies.map((t) => (
                <li key={t.key} title={t.blurb}>
                  <span className="font-display text-lg font-bold">{t.name}</span>
                  <span className="text-steel nums">
                    {" "}
                    {t.weeks.length > 1 ? `×${t.weeks.length}, ` : ""}wk {t.weeks.join(", ")}
                  </span>
                </li>
              ))}
            </ul>
          </li>
        ))}
      </ol>
      <details className="mt-4 text-sm">
        <summary className="cursor-pointer font-semibold text-orange underline underline-offset-4">What the hardware is for</summary>
        <dl className="mt-2 grid gap-x-6 gap-y-1 sm:grid-cols-2">
          {AWARD_KEYS.map((k) => (
            <div key={k} className="flex gap-2">
              <dt className="shrink-0 font-display text-base font-bold">{awardName(k)}</dt>
              <dd className="text-steel">{AWARD_BLURBS[k]}</dd>
            </div>
          ))}
        </dl>
      </details>
    </section>
  );
}
