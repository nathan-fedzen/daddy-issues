import Link from "next/link";
import { league } from "@/config/league";

interface Props {
  week?: number;
  date?: string;
}

// The wordmark is an SVG so it scales to the column width on every screen
// instead of guessing a font-size; lengthAdjust absorbs font-metric drift.
function Wordmark({ name }: { name: string }) {
  return (
    <svg viewBox="0 0 1200 172" className="block h-auto w-full" role="img" aria-label={name}>
      <text
        x="0"
        y="160"
        textLength="1200"
        lengthAdjust="spacing"
        fill="currentColor"
        style={{
          fontFamily: "var(--font-display)",
          fontWeight: 900,
          fontSize: 200,
          letterSpacing: "-0.02em",
          textTransform: "uppercase",
        }}
      >
        {name.toUpperCase()}
      </text>
    </svg>
  );
}

export function Masthead({ week, date }: Props) {
  return (
    <header>
      <div className="bg-ink text-paper">
        <div className="mx-auto max-w-[42rem] px-5 pt-6 pb-4">
          <Link href="/" className="block hover:text-orange focus-visible:text-orange">
            <Wordmark name={league.newsletter.name} />
          </Link>
        </div>
      </div>
      <div className="mx-auto max-w-[42rem] px-5">
        <p className="flex items-end justify-between gap-4 border-b-2 border-orange pb-2">
          {week ? (
            <span className="-mt-4 inline-block bg-orange px-3 py-1.5 font-display text-2xl font-black leading-none text-paper">
              Week {week}
            </span>
          ) : (
            <span className="pt-3 text-sm font-medium text-steel">{league.newsletter.tagline}</span>
          )}
          <span className="pb-0.5 text-sm font-medium text-steel">{date}</span>
        </p>
      </div>
    </header>
  );
}
