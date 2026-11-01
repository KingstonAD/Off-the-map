# Off the Map

A mobile-first daily geography trivia game. Everyone gets the same 7 prompts ("stops") each day, answers each one before a 20-second gate closes, and travels kilometres based on how few other players gave the same answer. All 7 stops Uncharted is a **Circumnavigation**, and the full 40,075 km (Earth's circumference) takes 1% or less on every stop.

The look is a vintage airport terminal: a dark concourse, an amber split-flap departure board, inked passport stamps, boarding passes and luggage tags. Premium and nostalgic, never cartoonish. Every screen should still look good as a TikTok screenshot.

## Voice

The game talks like a gate agent with a sense of humour: short, uppercase on the board, calm in the copy.

- The tagline is **"Don’t be a tourist."** It sits under the logo on Home. Tourist is the most common tier, so the line is a dare to go rarer.
- Answer checks stay neutral and never hint at what's correct: **"Did you mean Chad?"** (Yes / No) for a near miss, **"Not sure what that is. Try again."** for anything unrecognised.
- Board text (split-flap) is uppercase, at most 3 rows of 14 characters: `NAME A COUNTRY / BORDERING / CHINA`.
- Labels read like printed ticket fields: `GATE CLOSING`, `DISTANCE FLOWN`, `NEXT FLIGHT IN`.
- Travel words, used lightly: flight = the daily game, stop = a prompt, board = start, gate = timer, logbook = stats, travellers = players.
- The share caption is always **"Bon voyage. No spoilers."** Never put answers or prompts on a share card.
- Numbers always have thousands separators and a unit: `19,935 KM`, `6%`.

## Visual foundations

**Surfaces.** Terminal surfaces are dark: `terminal-900` for the screen, `terminal-800` for the board housing and panels, `terminal-700` for flap tiles, `terminal-600` for hairlines. Paper surfaces (`paper-100`) hold everything printed or inked: boarding passes, passport pages, luggage tags, the share card.

**Amber is the signal.** `amber-500` is for split-flap lettering, scores, the open gate and the one primary action per screen. `amber-700` is the dimmed version for column headers and untravelled route dots. Don't use amber for body copy.

**Ink lives on paper.** Stamps use `mix-blend-mode: multiply` and the `#otm-ink` roughening filter, so they only work on `paper-100`. On terminal surfaces (charts, the results list) use the `-lit` versions of each tier colour.

**Type.**
- Barlow Condensed (`--font-flap`): flaps, stamps, big numbers, button verbs.
- IBM Plex Mono (`--font-mono`): uppercase field labels with 0.16em tracking, plus data.
- IBM Plex Sans (`--font-sans`): sentences.

All three are hosted on Google Fonts and loaded by `components/bundle.css`.

**Shape.** Flap tiles use `radius-flap` (3px), panels `radius-card` (10px), and passes and the share card `radius-pass` (14px). Passes get half-moon notches at the perforation. Luggage tags get clipped corners and an eyelet.

**Depth.** Two shadows only: `shadow-board` (the board housing) and `shadow-pass` (paper lifted off the terminal). No glassmorphism, no gradients except the soft concourse light at the top of the screen and the faint scanlines.

## Scoring

**The rarer the answer, the farther you fly.** Every valid answer has a fixed **rarity** score from 0 to 1, set before the flight from how well known it is (Wikipedia page views, or a hand-set override). It sets both the tier and the km:

```
km = 5,725 × log(1/rarity) ÷ log(100)    capped at 5,725 per stop
```

A rarity of 1% or less earns the 5,725 km cap. A rarity of 50% earns about 860 km, and 100% earns 0. Seven capped stops make 5,725 × 7 = 40,075 km, Earth's circumference.

Never call the rarity a share of players. The live share of players who said the same answer is a separate, display-only stat, shown only once 20 players have answered a stop ("X% of players said it"). Below that, show "Not enough players yet".

## Answer tiers

Each tier has its own stamp ink and a `-lit` version for dark surfaces. Tiers differ in lightness as well as hue, and always carry their name, so colour is never the only signal.

| Tier | Ink | Rarity | km per stop |
| --- | --- | --- | --- |
| Tourist | `tier-tourist` slate | 25% or more | up to ~1,700 |
| Backpacker | `tier-backpacker` green | 10–25% | ~1,700–2,900 |
| Explorer | `tier-explorer` blue | 3–10% | ~2,900–4,400 |
| Uncharted | `tier-uncharted` plum | under 3% | ~4,400–5,725 |
| Lost Luggage | `tier-lost` charcoal | wrong answer or the gate closed | 0 |

The exact boundaries are 1,723 km (25%), 2,863 km (10%) and 4,359 km (3%). A stop exactly on a boundary takes the more common tier: 25% is Tourist, 10% is Backpacker, 3% is Explorer.

## Red-Eye badge

Red-Eye is a **badge, not a tier**. A correct answer stamped with 3 seconds or less left on the gate earns it, and it adds **no km**. The stop keeps its normal tier and distance.

- **Answer reveal:** a round red Red-Eye seal (`.otm-redeye`) slams down after the tier stamp, with a second, smaller thunk. Under the km there is a dashed note: "Correct with 0:02 left. Badge only, no extra km."
- **Share card:** the stop's tier square gets a red dot (`.otm-redeye-dot`), and the line under the squares names the count ("Across an ocean · 1 Red-Eye"). The text version adds a line `⏰ Red-Eye ×1`.
- **Results and Stats:** a small red marker on the stop's square, and a lifetime badge count in the logbook.

Ink: `tier-redeye` on paper, `tier-redeye-lit` on terminal surfaces.

## Circumnavigation

A **Circumnavigation** is a flight where all 7 stops are Uncharted. It is counted in the logbook and gets its own Results line ("Circumnavigation · all 7 Uncharted").

The distance itself only reaches the full 40,075 km when every stop is at 1% or less. An all-Uncharted flight can land anywhere from about 30,800 km (every stop just under 3%) to 40,075 km. The globe route closes the loop only at 40,075.

## Distance scale

| Distance | Means |
| --- | --- |
| 1,000 km | Across the border |
| 5,000 km | Across an ocean |
| 20,000 km | The other side of the world |
| 40,075 km | The full circumference (every stop at 1% or less) |

The Results phrase comes from this scale. "Circumnavigation" is reserved for all 7 stops Uncharted (see above).

## Motion

- **Split-flap.** Each tile spins forward through the drum and lands. 55ms per half-flip, staggered 28ms by column and 90ms by row.
- **Stamp thunk.** The stamp drops from 2.5× scale, overshoots to 0.94, settles at its rotation, and the screen shakes 4px for 300ms. A Red-Eye badge follows 450ms later with a smaller thunk and no shake.
- **Gate.** Two hatched doors slide in over the amber opening. At 3 seconds left the opening turns `gate-red` and pulses.
- **Results.** The plane flies a dotted great-circle route around the globe while the split-flap km total ticks up. Stop markers light up in tier colours as the plane passes them.
- Respect `prefers-reduced-motion`: flaps snap, stamps appear without the shake.

## Screens

The seven screens are live cards under **Screens**, each at 390 × 844: Home, How to Play, Gameplay, Answer reveal, Results, Share card, Stats. The **Components** cards hold the parts they are built from. All of them use the helpers in `components/bundle.js` (`window.OffTheMap`) and the classes in `components/bundle.css`.

## Decided

- **Km per stop:** the rarity formula above, capped at 5,725 km.
- **Tier bands:** Tourist 25%+, Backpacker 10–25%, Explorer 3–10%, Uncharted under 3%.
- **Red-Eye:** a badge only, with no km. It shows on the answer reveal and the share card.
- **Circumnavigation:** all 7 stops Uncharted.

## Open decisions

- How an answer is judged correct (accepted spellings and alternate names). This matters for Lost Luggage and for Red-Eye.
- The emoji used for each tier in the text share version (⬜ 🟩 🟦 🟪 ⬛, plus ⏰ for Red-Eye) are approximations of the inks.
