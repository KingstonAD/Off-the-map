# PassportStamp

The inked result of every answer: a rotated, rough-edged rubber stamp in its tier's ink, always pressed onto paper (`.otm-passport`, `--paper-100`).

- Markup: `.otm-stamp.t-<tier>` > `.in` > `.s-top`, `.s-tier`, `.s-ans`, `.s-row`. Add `.lost` to strike through the answer.
- Ink comes from `--tier-<tier>` (set as `--ink` by the `t-<tier>` class). `mix-blend-mode: multiply` plus the `#otm-ink` SVG filter (displacement + blotchy mask, injected by the bundle) give broken edges and uneven ink. Never put a stamp on a terminal surface — multiply disappears on dark.
- Rotation is `--rot`; vary it between −10° and +10° so no two stamps line up.
- `OffTheMap.stampSlam(stamp, shakeTarget)` plays the thunk: drops in from 2.5× scale, overshoots, settles, and shakes the screen 4px for 300ms.
- `.otm-seal` is the round mini stamp used for legends, faded older entries and "best answer".
- Tiers: Tourist (slate), Backpacker (green), Explorer (blue), Uncharted (plum), Lost Luggage (charcoal, struck through). They also differ in lightness and always carry their name, so colour is never the only cue.
- `.otm-redeye` is the Red-Eye **badge**: a round red seal with the time left, pressed after the tier stamp. It is not a tier and adds no km. Add `.slam` to thunk it in.
