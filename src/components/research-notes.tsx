import type { ResearchNote } from "@/lib/facts";

export function ResearchNotes({ notes }: { notes: ResearchNote[] }) {
  return (
    <section className="my-6 border-t-2 border-ink pt-3">
      <h2 className="font-display text-2xl font-bold leading-none">Research desk</h2>
      <p className="mt-1 text-sm text-steel">
        {notes.length} notes the writer had on the desk. Not shown to the league.
      </p>
      <ul className="mt-4 space-y-3">
        {notes.map((n, i) => (
          <li key={`${n.owner}-${n.player}-${i}`} className="border-b border-mist pb-3 text-[0.95rem] leading-snug">
            <p>
              <strong>{n.player}</strong> <span className="text-steel">({n.owner})</span>
            </p>
            <p className="mt-1">{n.what}</p>
            {n.source && (
              <a href={n.source} className="mt-1 inline-block break-all text-sm text-orange underline" rel="noreferrer">
                {n.source}
              </a>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
