import Link from "next/link";
import { league } from "@/config/league";

interface Props {
  week?: number;
  date?: string;
}

export function Masthead({ week, date }: Props) {
  return (
    <header className="mx-auto max-w-[42rem] px-5">
      <div className="overflow-hidden border-b-4 border-ink">
        <Link
          href="/"
          className="block font-display font-black uppercase leading-[0.8] tracking-[-0.02em] text-ink text-[clamp(4.25rem,19vw,10.5rem)] -mt-[0.1em] -mb-[0.09em] whitespace-nowrap hover:text-orange"
        >
          {league.newsletter.name}
        </Link>
      </div>
      <p className="flex items-baseline justify-between gap-4 border-b-2 border-orange py-2 text-sm font-medium text-steel">
        <span>{week ? `Week ${week}` : league.newsletter.tagline}</span>
        <span>{date}</span>
      </p>
    </header>
  );
}
