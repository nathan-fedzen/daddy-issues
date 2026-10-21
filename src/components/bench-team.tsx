import { benchAllStarsOf, type Facts } from "@/lib/facts";

export function BenchTeam({ facts }: { facts: Facts }) {
  const bench = benchAllStarsOf(facts);
  if (!bench || bench.starters.length === 0) return null;
  return (
    <section aria-label="All-bench team" className="mt-10">
      <h2 className="section-head">The all-bench team</h2>
      <p className="max-w-[36rem]">
        The best lineup the league left sitting this week. {bench.total.toFixed(1)} points, all of it on a bench.
      </p>
      <table className="mt-4 w-full border-collapse text-sm">
        <tbody>
          {bench.starters.map((s) => (
            <tr key={`${s.slot}-${s.teamId}-${s.name}`} className="border-t border-mist">
              <td className="w-12 py-2 pr-2 text-xs font-medium text-steel">{s.slot}</td>
              <td className="py-2 pr-2">
                <span className="font-semibold">{s.name}</span>
                <span className="block text-xs text-steel">sat by {s.owner}</span>
              </td>
              <td className="py-2 text-right font-display text-xl font-black nums">{s.points.toFixed(1)}</td>
            </tr>
          ))}
          <tr className="border-t-2 border-ink">
            <td className="py-2 pr-2 text-xs font-medium text-steel">Total</td>
            <td />
            <td className="py-2 text-right font-display text-2xl font-black nums">{bench.total.toFixed(1)}</td>
          </tr>
        </tbody>
      </table>
    </section>
  );
}
