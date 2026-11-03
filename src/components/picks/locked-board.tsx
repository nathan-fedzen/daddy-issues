export interface BoardSide {
  teamId: string;
  owner: string;
  teamName: string;
  record: string;
  projected: number;
  points: number;
  voters: string[];
}

export interface BoardMatchup {
  key: string;
  home: BoardSide;
  away: BoardSide;
  started: boolean;
  final: boolean;
  winner: string | null;
}

function Side({ m, side, other, align }: { m: BoardMatchup; side: BoardSide; other: BoardSide; align: "left" | "right" }) {
  const right = align === "right";
  const won = m.winner === side.teamId;
  const lost = m.winner !== null && !won;
  const leading = m.started && !m.final && side.points > other.points;
  const score = !m.started ? "text-mist" : won || leading ? "text-ink" : "text-steel";
  return (
    <div className={`min-w-0 ${right ? "text-right" : ""} ${won ? (right ? "border-r-4 border-orange pr-2" : "border-l-4 border-orange pl-2") : ""}`}>
      <p className={`truncate font-display text-xl font-bold leading-tight ${lost ? "text-steel" : ""}`}>{side.owner}</p>
      <p className="truncate text-xs font-medium text-steel">
        {side.teamName !== side.owner && `${side.teamName}, `}
        {side.record}
      </p>
      <p className={`mt-1 font-display font-black leading-none nums text-[clamp(2.25rem,9vw,3.25rem)] ${score}`}>
        {side.points.toFixed(2)}
      </p>
      {side.projected > 0 && <p className="text-xs font-medium text-steel nums">{side.projected.toFixed(1)} projected</p>}
      <ul className="mt-2 text-sm leading-snug">
        {side.voters.length === 0 ? (
          <li className="text-steel">Nobody</li>
        ) : (
          side.voters.map((v) => (
            <li key={v} className={won ? "font-semibold" : lost ? "text-steel line-through" : ""}>
              {v}
            </li>
          ))
        )}
      </ul>
    </div>
  );
}

export function LockedBoard({ week, matchups, nonVoters }: { week: number; matchups: BoardMatchup[]; nonVoters: string[] }) {
  // Once the whole week is final the banner says so; per-game captions only
  // earn their place while some games are still going.
  const mixed = matchups.some((m) => !m.final);
  return (
    <section aria-label={`Week ${week} picks`} className="mt-2">
      <h2 className="section-head">Who picked whom</h2>
      <p className="max-w-[36rem]">
        Live scores with everyone&apos;s pick under the side they took. A name gets struck through when the pick dies.
      </p>
      <ol className="mt-6">
        {matchups.map((m) => (
          <li key={m.key} className="border-t-2 border-ink py-5">
            <div className="grid grid-cols-2 gap-4">
              <Side m={m} side={m.home} other={m.away} align="left" />
              <Side m={m} side={m.away} other={m.home} align="right" />
            </div>
            {mixed && m.final && <p className="mt-2 text-xs font-semibold text-steel">Final</p>}
          </li>
        ))}
      </ol>
      {nonVoters.length > 0 && (
        <p className="mt-4 border-t-2 border-ink pt-3 text-sm text-steel">
          Didn&apos;t pick: {nonVoters.join(", ")}.
        </p>
      )}
    </section>
  );
}
