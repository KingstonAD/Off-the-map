# Off the Map — Build Spec

A mobile-first daily geography trivia game. Everyone gets the same 7 prompts ("stops") each day. Players type one answer per stop before a 20-second gate closes. The rarer the answer, the farther you fly. A perfect game is 40,075 km (Earth's circumference).

**Launch target:** Flight #1 goes live Tuesday, Oct 27, 2026 at 12:00 AM ET.

## What's in this folder

| Path | What it is |
|---|---|
| `BUILD_SPEC.md` | This file. The source of truth for behaviour and scoring. |
| `design/README.md` | Brand book from Claude Design: voice, colours, type, motion, tiers. |
| `design/tokens.json` | Every colour, type style, spacing, radius and shadow token. |
| `design/components/bundle.css` | All component styles (`otm-` classes). Port these, don't redesign. |
| `design/components/bundle.js` | Vanilla helpers: split-flap board, stamp slam, gate timer, count-up, scoring functions. Port to TypeScript/React. |
| `design/components/*/preview.html` | The 7 designed screens at 390 × 844. Match them closely. |
| `data/flights/2026-10-27.json` | Flight #1: 7 prompts with full answer lists and aliases. |

The design previews contain **sample data** (scores, streaks, the 40,075 km sample flight). Replace all of it with real data.

## Stack

- **Next.js (App Router) + TypeScript**, deployed on **Vercel**
- **Supabase (Postgres)** for answer counts and plays
- No user accounts in v1. Each player gets an anonymous ID (UUID in an httpOnly cookie, mirrored to localStorage).
- Fonts from Google Fonts: Barlow Condensed, IBM Plex Mono, IBM Plex Sans (see `bundle.css`).

## Screens (match `design/components/*/preview.html`)

1. **Home** `/` — split-flap logo, departures board, Board Now, countdown to next 12 AM ET flight, streak luggage tag.
2. **How to Play** `/how-to-play` — rules, distance scale, tier table.
3. **Gameplay** `/play` — split-flap prompt, gate timer, free-text answer input with "Did you mean" check, stop counter, running km.
4. **Answer reveal** (state inside `/play`) — passport stamp slam, km count-up, "what the terminal said" distribution, Red-Eye badge if earned.
5. **Results** `/results` — plane route on globe, split-flap total, 7-stop breakdown, best answer of the day.
6. **Share card** (sheet from Results) — boarding-pass card, 7 stamp-colour squares, copyable emoji text.
7. **Stats** `/logbook` — streak, longest trip, Circumnavigations, last 14 flights, tier history.

Add one screen not in the design:

8. **Yesterday** `/yesterday` — yesterday's 7 prompts with final crowd shares and the rarest correct answers ("Only 0.4% said Tajikistan"), for every stop that at least 20 players answered. This is daily TikTok content, so make it screenshot-friendly using the same visual language.

The whole game uses the single dark "terminal" theme in `tokens.json`. No light mode.

## Daily flights

- A flight unlocks at **12:00 AM America/New_York** every day.
- Flight number = days since 2026-10-27 + 1.
- Flights live in `data/flights/YYYY-MM-DD.json` (same shape as the launch file). Load them at build time or seed them into the database with a script.
- Each player can play each flight **once**. If they leave mid-flight, they resume at the next unanswered stop; an abandoned stop counts as Lost Luggage.

### Flight file format

Each stop has:

- `prompt` — full sentence shown to screen readers and on Yesterday.
- `board` — up to **3 lines of at most 14 characters**, uppercase, shown on the split-flap board. Never break a word.
- `category` — the label in the board header (e.g. "Countries", "US States").
- `pool` — which list typed answers are matched against (`country`, `us_state`; add `city` later).
- `answers` — every valid answer, each with an `id`, `name`, optional `aliases`.
- `notes` — optional judgement calls (what's accepted and why).

### Validation script (`npm run check-flights`)

Fail the build if any stop:

- has fewer than **8 valid answers**,
- has a `board` line over 14 characters or more than 3 lines,
- has an answer `id` that isn't in its `pool` list,
- repeats an answer `id`.

## Answering

- **No autocomplete.** Players type freely, then press **Stamp** or Enter. Nothing is suggested while they type.
- On Stamp the text is **normalized**: case, accents, punctuation and spaces are ignored, `&` reads as "and", and a leading "the" is dropped ("The Gambia" = "gambia", "Côte d'Ivoire" = "cote d ivoire").
- It is then matched against the **whole pool**, never the valid answers. For `country` that's every country (~197); for `us_state` all 50 states.
  1. **Exact match** on any name or alias: stamped at once.
  2. Otherwise **fuzzy match** (edit distance; swapping two adjacent letters counts as one edit). Allowed typos depend on the length of the name: **1** for short names (≤ 5 letters), **2** for medium (6–10), **3** for long (11+). The closest name is offered as **"Did you mean Chad?"** with **Yes** / **No**. If a second name is about as close (within one more edit), both are shown as buttons ("ira" → Iran, Iraq). Yes stamps that entry; No returns to the input with the text kept.
  3. **Nothing close**: show "Not sure what that is. Try again." The stop is not used up; the player keeps typing.
- None of these checks may hint at whether an answer is correct; they only ask what the player meant. The **gate timer keeps running** throughout.
- A recognised entry that isn't a valid answer (a real country that doesn't fit the prompt) is stamped normally and judged **Lost Luggage**.
- The server still rejects any submitted `entityId` that isn't in the stop's pool (`not_in_pool`).
- One submission per stop. No changing an answer once it's stamped.
- Answer lists are **never sent to the client** before a stop is answered. The server judges every answer.

### Timer

- 20 seconds per stop. The server records when each stop's prompt was served and rejects submissions after **20 s + 1.5 s grace**.
- Gate goes red and pulses at 3 seconds left (see `GateTimer` in the design).
- Timeout = Lost Luggage, 0 km.

## Scoring

All scoring runs on the server. Port the formulas from `bundle.js` (`kmFor`, `tierFor`).

### 1. Rarity (fixed)

Every valid answer has a fixed `rarity` between 0 and 1. It is the answer's Wikipedia prior (below), unless the flight file sets an override on the answer:

```json
{ "id": "TJ", "name": "Tajikistan", "prior": 0.04512, "rarity": 0.02 }
```

`npm run check-flights` fails if an override isn't `0 < rarity ≤ 1`. The rarity alone sets the score. How many other players gave the same answer never changes anyone's km or tier. The rarer the answer, the farther you fly.

### 2. Prior (`npm run priors`)

A script that, for each answer in a flight file, fetches the last 12 months of English Wikipedia page views (Wikimedia REST pageviews API) and sets:

```
prior_i = sqrt(views_i) / Σ sqrt(views_j)    (over all valid answers for that stop)
```

The square root flattens the gap between famous and obscure answers so obscure ones aren't crushed. Write the priors into the flight file (or the database). Map each answer to its Wikipedia article title in the script.

### 3. Kilometres and tier

```
km   = round(min(5725, 5725 × ln(1/rarity) / ln(100)))
tier = rarity ≥ 25% → Tourist
       rarity ≥ 10% → Backpacker
       rarity ≥ 3%  → Explorer
       otherwise    → Uncharted
```

| Tier | Rarity | km per stop |
|---|---|---|
| Tourist | 25%+ | up to 1,723 |
| Backpacker | 10–25% | 1,723–2,863 |
| Explorer | 3–10% | 2,863–4,359 |
| Uncharted | under 3% | 4,359–5,725 |
| Lost Luggage | wrong or timed out | 0 |

- **Red-Eye** is a badge only, no km: a correct answer submitted with 3 seconds or less left, judged by the server's timing.
- **Circumnavigation**: all 7 stops Uncharted. Tracked in the logbook.
- 7 × 5,725 = 40,075 km, the maximum.

### 4. Lock-in

A player's km and tier are **computed on the server and locked at the moment they submit**, and stored with the play (`plays.share` holds the rarity it was scored with). Their score never changes after that.

### 5. Live crowd (display only)

The server still counts how many players gave each answer. The **crowd share** is `count_of_this_answer / total_correct_answers` (wrong answers and timeouts don't count toward the denominator). It is a stat, never the score.

Crowd stats stay hidden until **at least 20 players** have answered that stop (right, wrong or timed out). Until then, the reveal shows "Not enough players yet" in place of the percentage and in place of the "What the terminal said" distribution, and Yesterday does the same for that stop.

- **Answer reveal:** the tier comes from rarity. "X% of players said it" appears separately, only once the threshold is met.
- **Yesterday:** real crowd shares ("Only 0.4% said Tajikistan") for stops that met the threshold.

### Unit tests (required)

- `kmFor(0.40) ≈ 1,139`, `kmFor(0.05) = 3,724`, `kmFor(0.02) = 4,863`, `kmFor(0.01) = 5,725`, `kmFor(0.001) = 5,725`.
- Tier boundaries: 25% → Tourist, 10% → Backpacker, 3% → Explorer.
- Fixed rarity: the same answer scores the same no matter how many other players answered; a `rarity` override changes the score.
- Crowd stats are hidden under 20 answers and equal `count / correct` at 20 or more.
- Late submission rejected; Red-Eye awarded at 3.0 s left, not at 3.1 s.

## API

| Route | Does |
|---|---|
| `GET /api/flight/today` | Flight number, date, number of stops, the player's progress. No prompts or answers. |
| `POST /api/stop/start` `{ stop }` | Returns that stop's `board`, `category`, `pool`; records the server start time. |
| `POST /api/stop/answer` `{ stop, entityId }` | Judges the answer, locks in tier and km from the fixed rarity, updates the crowd counts atomically, returns tier, km, rarity, Red-Eye, and (once 20 players have answered the stop) the top 4 answers with crowd shares. |
| `GET /api/results/today` | The player's 7 stops, total km, best answer, share-card data. |
| `GET /api/yesterday` | Final crowd shares for every answer of yesterday's flight (stops with 20+ answers only). |
| `GET /api/logbook` | The player's streak, longest trip, Circumnavigations, last 14 flights, tier history. |

Use a Postgres function for the answer so the count increment and the score lock-in happen in one transaction.

## Database (Supabase)

- `flights` — `date` (pk), `number`
- `stops` — `flight_date`, `stop_index`, prompt fields, `answers` (jsonb with priors)
- `answer_counts` — `flight_date`, `stop_index`, `entity_id`, `count` — pk on all three but count
- `stop_totals` — `flight_date`, `stop_index`, `correct_count`, `total_count`
- `plays` — `player_id`, `flight_date`, `stop_index`, `entity_id` (nullable), `served_at`, `answered_at`, `share` (the fixed rarity it was scored with), `km`, `tier`, `red_eye` — unique on `(player_id, flight_date, stop_index)`

Enable row-level security; only the server (service role) writes.

## Share card

- Text version:
  ```
  Off the Map #1 ✈️ 16,601 km
  ⬜🟩🟦🟪🟦🟩⬛
  ⏰ Red-Eye ×1
  Bon voyage. No spoilers.
  <your domain>
  ```
  (⬜ Tourist, 🟩 Backpacker, 🟦 Explorer, 🟪 Uncharted, ⬛ Lost Luggage; the Red-Eye line only when earned.)
- Image version: render the boarding-pass card from the design to a PNG (e.g. `@vercel/og` / Satori) so it can be saved and posted.
- **Every number on the card is computed**: total km, the distance phrase, the plane's position along the route (total ÷ 40,075), the Red-Eye count. In the design these are typed in by hand.
- Never include prompts or answers on the card.
- Use the Web Share API where available, with copy-to-clipboard as fallback.

### Distance phrase (Results and Share card)

| Total | Phrase |
|---|---|
| under 1,000 km | Still on the runway |
| 1,000+ | Across the border |
| 5,000+ | Across an ocean |
| 20,000+ | The other side of the world |
| all 7 Uncharted | Circumnavigation |

(The design's Results screen has a "Nearly the other side of the world" line at 18,000 km. Drop it; use this table.)

## Stats and streaks

- v1 stores the logbook server-side by anonymous player ID, so it survives a refresh but not a cleared cookie. Accounts come later.
- Streak = consecutive daily flights completed, by ET date.

## Motion and accessibility

- Follow the motion specs in `design/README.md` (split-flap timing, stamp slam, screen shake, gate pulse, plane route).
- Respect `prefers-reduced-motion`: tiles snap, stamps appear without the shake, the plane jumps to the end.
- Split-flap boards set `aria-label` to the full text; tiles are `aria-hidden`.
- The gate announces only "3 seconds" and "gate closed", not every tick.
- Must feel right at 390 px wide and look good in a phone screenshot.

## Build order

1. Port tokens, `bundle.css` and the `bundle.js` helpers into the app (typed React components: `SplitFlap`, `PassportStamp`, `GateTimer`, `BoardingPassButton`, `LuggageTag`).
2. Flight file loader + `check-flights` script; load `2026-10-27.json`.
3. Scoring module + unit tests.
4. Supabase schema + the answer function.
5. API routes.
6. Screens in order: Gameplay → Answer reveal → Results → Share card → Home → How to Play → Logbook → Yesterday.
7. `priors` script; run it for Flight #1.
8. Deploy to Vercel; play a full flight on a phone.

## Later (not v1)

- More pools: world cities, capitals, rivers.
- Accounts so the logbook follows you across devices.
- An admin page for writing and validating future flights.
- Friends leaderboard.
