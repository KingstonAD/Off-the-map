# SplitFlap

Amber split-flap tiles that spin through the drum and land on a character — used for every prompt, the wordmark, departure rows, countdowns and the results total.

- `OffTheMap.board(el, lines, { cols, size, align, instant })` builds the grid and returns `{ set(lines, { stagger, direct }), setInstant(lines) }`.
- Sizes: default (22×34, prompts — 14 columns fit a 390px phone), `sm` (15×23, data rows), `xl` (33×50, wordmark and totals).
- Each tile flips top-half-down then bottom-half-in (`--fd`, 55ms per half). Tiles stagger 28ms by column and 90ms by row, so text reads left to right like a real Solari board.
- Use `direct: true` for once-a-second updates (countdowns) so a tile flips once instead of spinning.
- The board sets `aria-label` to the full text; tiles are `aria-hidden`.
- Prompts are always uppercase; wrap words, never break mid-word. Keep prompts to 3 rows of 14.
- Reduced motion: tiles snap to the final character.
