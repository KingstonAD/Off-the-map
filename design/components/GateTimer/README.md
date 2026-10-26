# GateTimer

The 20-second answer clock, drawn as two hatched gate doors sliding shut over a lit amber opening.

- Markup: `.otm-gate` > `.g-head` (`.otm-label`, `.g-time`) + `.g-track` > `.g-door.l`, `.g-door.r`. The doors read `--frac` (1 = wide open, 0 = shut).
- `OffTheMap.gate(el, { seconds: 20, onTick, onEnd, loop })` drives it and adds `.final` at 3 seconds left: the opening turns `--gate-red`, pulses, and the label and time go red. That window is also when a correct answer earns the Red-Eye badge (no km).
- `--gate-red` is reserved for this state.
- The track has `role="timer"`; announce only "3 seconds" and "gate closed", not every tick.
