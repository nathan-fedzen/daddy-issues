import Link from "next/link";
import { chugListOf, type Facts } from "@/lib/facts";

export function ChugCallout({ facts }: { facts: Facts }) {
  const chugList = chugListOf(facts);
  if (chugList.length === 0) return null;
  return (
    <aside className="mt-10 border-2 border-ink p-4">
      <p className="font-display text-2xl font-bold leading-none">The chug list</p>
      <ul className="mt-3">
        {chugList.map((c) => (
          <li key={`${c.teamId}-${c.player}`} className="flex items-baseline justify-between gap-4 border-t border-mist py-2">
            <span>
              <span className="font-semibold">{c.owner}</span>
              <span className="block text-xs text-steel">
                {c.player} at {c.slot}, 0 points
              </span>
            </span>
            <span className="shrink-0 bg-orange px-2 py-0.5 font-display text-sm font-bold text-paper">Owes a chug</span>
          </li>
        ))}
      </ul>
      <Link href="/chugs" className="mt-3 inline-block font-semibold text-orange underline underline-offset-4">
        Upload the video, or watch the others
      </Link>
    </aside>
  );
}
