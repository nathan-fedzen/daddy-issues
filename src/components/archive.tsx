import Link from "next/link";
import type { IssueSummary } from "@/lib/issues/store";
import { formatDate } from "@/lib/issues/queries";

export function Archive({ issues, currentWeek }: { issues: IssueSummary[]; currentWeek?: number }) {
  const others = issues.filter((i) => i.week !== currentWeek);
  if (others.length === 0) return null;
  return (
    <section aria-label="Back issues" className="mt-14">
      <h2 className="relative border-t-2 border-ink pt-2 font-display text-[2rem] font-bold leading-none before:absolute before:-top-[2px] before:left-0 before:h-[6px] before:w-8 before:bg-orange">
        Back issues
      </h2>
      <ol className="mt-2">
        {others.map((i) => (
          <li key={i.week} className="border-b border-mist">
            <Link
              href={`/week/${i.week}`}
              className="group flex items-baseline gap-4 py-3 hover:text-orange"
            >
              <span className="w-12 shrink-0 font-display text-3xl font-black leading-none nums">
                {i.week}
              </span>
              <span className="min-w-0 grow">
                <span className="block font-semibold leading-snug group-hover:underline">
                  {i.headline}
                </span>
                <span className="block text-xs text-steel">{formatDate(i.publishedAt)}</span>
              </span>
            </Link>
          </li>
        ))}
      </ol>
    </section>
  );
}
