# Off the Map

Daily geography trivia. 7 stops, 20 seconds each, and rare answers travel farther. See `BUILD_SPEC.md` for the rules and `design/` for the brand book.

## Run locally

```bash
npm install
npm run dev            # http://localhost:3000
```

Without Supabase env vars, the server uses a local dev store in `.data/dev-store.json`. To play Flight #1 before launch day, set the date:

```bash
OTM_TODAY_OVERRIDE=2026-10-27 npm run dev
```

`OTM_TODAY_OVERRIDE` is ignored when `VERCEL_ENV=production`.

## Scripts

| Command | Does |
|---|---|
| `npm test` | Unit tests: scoring, tiers, blend, timing / Red-Eye, answer matching, flight validation, game flow |
| `npm run check-flights` | Validates every `data/flights/*.json` file (runs before every `npm run build`) |
| `npm run priors [YYYY-MM-DD]` | Fetches 12 months of Wikipedia pageviews and writes `prior` onto each answer. Set `PRIORS_CONTACT` to your site or email (Wikimedia asks for a contact in the User-Agent). |
| `npm run relaunch -- --launch YYYY-MM-DD` | Moves Flight #1 to a new date and re-dates every flight file (writes `data/launch.json`). Commit and deploy afterwards. |
| `npm run relaunch -- --reset --yes` | Deletes **all** play data (plays, answer counts, stop totals): every player's history and streaks. Targets Supabase if its env vars are set (e.g. in `.env.local`), otherwise the local dev store. Without `--yes` it only prints what it would do. |
| `npm run seed` | Mirrors flight files into the Supabase `flights` / `stops` tables (optional; the app reads flights from the deployed files) |

## Adding a flight

1. Write `data/flights/YYYY-MM-DD.json` (same shape as `2026-10-27.json`; `flight` = days since 2026-10-27 + 1).
2. Make sure every alias is also in `data/pools/*.json`, so typed answers can match it. `check-flights` warns if one isn't.
3. `npm run priors YYYY-MM-DD`, then `npm run check-flights`.
4. Commit and deploy before 12 AM ET that day.

## Friends beta, then public launch

1. Beta: `npm run relaunch -- --launch <beta start date>`, then commit and deploy. Friends play from Flight #1.
2. Public launch: `npm run relaunch -- --launch <public date> --reset --yes` with the production Supabase vars in `.env.local`. Then `npm run seed` (optional), commit and deploy before 12 AM ET on the public date. Everyone starts at Flight #1 with an empty logbook.

Beta players keep their anonymous ID cookie, but their plays, streaks and logbooks are wiped by the reset.

## Deploy

1. **Supabase:** create a project and run `supabase/migrations/0001_init.sql` in the SQL editor.
2. **Vercel:** import the repo and set the environment variables:
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY` (server only)
   - `NEXT_PUBLIC_SITE_DOMAIN` (shown at the end of the share text, e.g. `offthemap.app`)
3. Optional: `npm run seed` with the same vars in `.env.local`.

## Layout

- `lib/scoring.ts`: `kmFor`, `tierFor`, blend, timing. The SQL function `otm_submit_answer` mirrors these formulas; keep the two in sync.
- `lib/game.ts`: server rules (judging, lock-in, resume / abandon, results, Yesterday, logbook) on top of a `Store` (Supabase or local).
- `app/api/*`: the six routes from the spec, plus `/api/share-image` (PNG share card).
- `components/`: typed ports of the design bundle (`SplitFlap`, `PassportStamp`, `GateTimer`, `BoardingPass`, `LuggageTag`) and the screens.
