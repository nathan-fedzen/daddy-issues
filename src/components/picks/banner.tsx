interface Props {
  open: boolean;
  week: number;
  lockAt: string;
  submitted: number;
  total: number;
  started: boolean;
  allFinal: boolean;
}

// The one loud element on the page: orange while the window is open, ink once
// it shuts, so the state reads before any text does.
export function PicksBanner({ open, week, lockAt, submitted, total, started, allFinal }: Props) {
  const title = open ? `Week ${week} picks are open` : allFinal ? `Week ${week} is final` : `Week ${week} picks are locked`;
  const count = `${submitted} of ${total} in`;
  const detail = open
    ? `Locks ${lockAt}. ${count}.`
    : allFinal
      ? `${count}. Next slate opens Tuesday.`
      : started
        ? `${count}. Scores refresh every few minutes.`
        : `${count}. Scores start with the Thursday game.`;
  return (
    <div
      role="status"
      className={`relative left-1/2 w-screen -translate-x-1/2 ${open ? "bg-orange" : "bg-ink"} text-paper`}
    >
      <div className="mx-auto flex max-w-[42rem] flex-wrap items-end justify-between gap-x-6 gap-y-1 px-5 py-4">
        <p className="font-display font-black leading-none text-[clamp(2rem,8vw,2.75rem)]">{title}</p>
        <p className="pb-0.5 text-sm font-medium">{detail}</p>
      </div>
    </div>
  );
}
