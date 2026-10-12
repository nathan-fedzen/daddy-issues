import { league } from "@/config/league";
import { Masthead } from "@/components/masthead";
import { buildLedger, listChugs, owedFromIssues, teamChoices, type ChugVideo } from "@/lib/chugs";
import { publishedIssues } from "@/lib/issues/queries";
import { storeFromEnv, type Issue } from "@/lib/issues/store";
import { UploadForm } from "./upload-form";

export const dynamic = "force-dynamic";

function when(ms: number): string {
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", timeZone: "America/Denver" }).format(ms);
}

export default async function ChugsPage() {
  const store = storeFromEnv();
  const summaries = await publishedIssues();
  const issues = (await Promise.all(summaries.map((s) => store.get(s.season, s.week)))).filter(
    (i): i is Issue => i !== null,
  );
  const videos = await listChugs();
  const ledger = buildLedger(owedFromIssues(issues), videos);
  const outstanding = ledger.filter((l) => !l.video);
  const byWeek = new Map<number, ChugVideo[]>();
  for (const v of videos) byWeek.set(v.week, [...(byWeek.get(v.week) ?? []), v]);
  const weeks = [...byWeek.keys()].sort((a, b) => b - a);
  const latestWeek = summaries[0]?.week ?? 1;

  return (
    <>
      <Masthead link={{ href: "/", label: "Latest issue" }} />
      <main className="mx-auto max-w-[42rem] px-5 pb-20">
        <h1 className="headline mt-8 mb-4">The chug tape</h1>
        <p className="max-w-[36rem]">
          Start a player who scores exactly zero and you owe the chat a video of you chugging a beer, shirtless. This
          is where the videos live. The rule is the rule.
        </p>

        <section aria-label="Outstanding" className="mt-10">
          <h2 className="section-head">Who owes</h2>
          {outstanding.length === 0 ? (
            <p className="text-steel">Nobody. Either the league has learned or nobody has zeroed yet.</p>
          ) : (
            <ul>
              {outstanding.map((l) => (
                <li key={`${l.week}-${l.teamId}-${l.player}`} className="flex items-baseline justify-between gap-4 border-b border-mist py-2">
                  <span>
                    <span className="font-semibold">{l.owner}</span>
                    <span className="block text-xs text-steel">
                      Week {l.week}: started {l.player} at {l.slot} for 0
                    </span>
                  </span>
                  <span className="shrink-0 bg-orange px-2 py-0.5 font-display text-sm font-bold text-paper">Still owed</span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section aria-label="Upload" className="mt-10">
          <h2 className="section-head">Pay up</h2>
          <UploadForm season={league.season} teams={teamChoices()} defaultWeek={latestWeek} />
        </section>

        <section aria-label="Videos" className="mt-10">
          <h2 className="section-head">The tape</h2>
          {weeks.length === 0 ? (
            <p className="text-steel">No videos yet. The first one sets the tone.</p>
          ) : (
            weeks.map((w) => (
              <div key={w} className="mt-6">
                <p className="mb-3 font-display text-xl font-bold">Week {w}</p>
                <div className="grid gap-6 sm:grid-cols-2">
                  {byWeek.get(w)!.map((v) => (
                    <figure key={v.pathname} id={v.pathname.replace(/[^a-z0-9]/gi, "-")}>
                      <video
                        src={v.url}
                        controls
                        playsInline
                        preload="metadata"
                        className="block w-full border-[3px] border-ink bg-ink"
                      />
                      <figcaption className="mt-2 flex items-baseline justify-between text-sm">
                        <span className="font-semibold">{v.owner}</span>
                        <span className="text-steel">{when(v.uploadedMs)}</span>
                      </figcaption>
                    </figure>
                  ))}
                </div>
              </div>
            ))
          )}
        </section>
      </main>
    </>
  );
}
