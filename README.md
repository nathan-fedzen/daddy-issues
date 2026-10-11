# Daddy Issues

Weekly roast newsletter site for the Mile High Daddy and Subs fantasy football league. Every Tuesday it reads the ESPN box scores, works out who did what, writes the issue, and publishes it at one URL the league can read.

## How it works

1. `src/lib/espn` pulls the league from the ESPN fantasy API with your private-league cookies.
2. `src/lib/facts` turns that into a facts sheet: results, margins, points left on the bench, luck, transactions (from the ESPN activity feed, the only view with full trade legs), Monte Carlo playoff odds. Pure functions, unit tested.
3. `src/lib/writer` hands the facts sheet and a style guide to Claude and gets the issue back as Markdown. The prompt forbids inventing numbers that are not in the facts.
4. `src/lib/issues` stores each issue as JSON, on disk locally and in Vercel Blob in production.
5. The Next.js app renders the latest published issue at `/`, any issue at `/week/N`, and a review page at `/review/N?key=...` where drafts get published or regenerated.

## Setup

```bash
npm install
cp .env.example .env.local   # fill in ESPN_S2, ESPN_SWID, ANTHROPIC_API_KEY, keys
npm run seed:week4           # inaugural issue from the bundled fixture
npm run dev
```

Owners, lore, rivalries, running bits and heat level live in `src/config/league.ts`.

## Commands

| Command | What it does |
|---|---|
| `npm run dev` | Dev server |
| `npm test` | Facts engine unit tests |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run lint` | ESLint |
| `npm run generate -- --week 4` | Fetch from ESPN, write the issue (draft unless `--publish` or `AUTO_PUBLISH=true`) |
| `npm run generate -- --fixture data/fixtures/2026-week-04.snapshot.json --facts` | Print the facts sheet for a saved snapshot |
| `ROAST_WRITER=stub npm run generate -- --fixture ...` | Run the pipeline without an API key |
| `npm run seed:week4` | Store the hand-written week 4 issue |

## Deploying

Vercel, with `vercel.json` scheduling `GET /api/cron/generate` every Tuesday at 11:00 UTC. Set the same env vars as `.env.local` plus `BLOB_READ_WRITE_TOKEN` from a Vercel Blob store. Issues land as drafts unless `AUTO_PUBLISH=true`; the review link is `/review/<week>?key=<REVIEW_KEY>`.
