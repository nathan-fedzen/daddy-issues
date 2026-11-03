# league-roast

Weekly roast newsletter site for Nathan's ESPN fantasy league. Next.js App Router, TypeScript, Tailwind v4, no database (issues are JSON in `data/issues` locally and Vercel Blob in prod).

- Visual rules live in `DESIGN.md`. Read it before touching anything under `src/app` or `src/components`.
- League names, lore, heat level: `src/config/league.ts`.
- Facts engine is pure and tested (`src/lib/facts`). The writer may only cite numbers from the facts sheet; keep it that way.
- The research desk (`src/lib/research`) looks up the NFL games with web search and writes notes into `facts.research` before the writer runs. Lead selection is pure and tested; `ROAST_RESEARCH=off` skips it.
- With the Blob token in `.env.local`, `npm run generate` writes to production. Use `--local` for `data/issues`.
- Pick'em lives in `src/lib/picks` (time, store, grading all pure and tested) and `src/app/picks`. Lock time and first week are in `league.picks`.
- `scripts/build-fixture-week4.mjs` is a one-off converter kept for provenance of the seed fixture.
- `npm test`, `npm run typecheck`, `npm run lint` must pass before calling work done.
