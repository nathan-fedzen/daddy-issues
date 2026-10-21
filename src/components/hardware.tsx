import Link from "next/link";
import { weekAwards } from "@/lib/awards";
import type { Facts } from "@/lib/facts";

export function Hardware({ facts }: { facts: Facts }) {
  const awards = weekAwards(facts);
  if (awards.length === 0) return null;
  return (
    <section aria-label="This week's hardware" className="mt-10">
      <h2 className="section-head">This week&apos;s hardware</h2>
      <ul className="divide-y divide-mist border-y border-mist">
        {awards.map((a) => (
          <li key={a.key} className="flex items-baseline justify-between gap-4 py-2">
            <span className="min-w-0">
              <span className="font-display text-xl font-bold leading-none">{a.name}</span>
              <span className="block text-xs text-steel">{a.blurb}</span>
            </span>
            <span className="shrink-0 text-right">
              {a.winners.map((w) => (
                <span key={w.teamId} className="block">
                  <span className="font-semibold">{w.owner}</span>
                  <span className="block text-xs text-steel">{w.detail}</span>
                </span>
              ))}
            </span>
          </li>
        ))}
      </ul>
      <Link href="/season#trophies" className="mt-3 inline-block font-semibold text-orange underline underline-offset-4">
        The trophy case
      </Link>
    </section>
  );
}
