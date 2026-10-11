# league-roast

Weekly roast newsletter site for Nathan's ESPN fantasy league. Next.js App Router, TypeScript, Tailwind v4, no database (issues are JSON in `data/issues` locally and Vercel Blob in prod).

- Visual rules live in `DESIGN.md`. Read it before touching anything under `src/app` or `src/components`.
- League names, lore, heat level: `src/config/league.ts`.
- Facts engine is pure and tested (`src/lib/facts`). The writer may only cite numbers from the facts sheet; keep it that way.
- `scripts/build-fixture-week4.mjs` is a one-off converter kept for provenance of the seed fixture.
- `npm test`, `npm run typecheck`, `npm run lint` must pass before calling work done.
