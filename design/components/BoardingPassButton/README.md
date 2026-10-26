# BoardingPassButton

Primary actions are boarding passes: a main field with a big condensed label and a mono "printed" line, a perforated tear-off stub with a code and barcode, and half-moon notches cut where they meet.

- `.otm-pass` (paper) for secondary actions, `.otm-pass.amber` for the one primary action per screen (Board Now, Share). `.slim` (64px) for in-flow actions like Next Stop.
- Content: `.main` > `small` (what happens: flight, stop) + `strong` (the verb, ≤ 14 characters); `.stub` > `small` label + `b` short code (+ optional `.otm-barcode`).
- The notches are a CSS mask, so they show whatever is behind the button.
- Hover lifts 1px; press sinks 1px. Focus shows a 2px amber ring offset 3px.
- `.otm-ghost` is the tertiary text button (How to Play, Save Image).
