# PEARL SAIL · ROOF DUEL — merge notes (s36 → s36d)

## How to add it
1. Unzip into your project folder (the one with `Kyoto Sword Duel.dc.html`, `engine/`, `minigames/`, `worlds/`). Keep the folder paths, say yes to replace.
2. Copy the line under "Duel engine reuse (s36)" from `PROJECT_NOTES -CLAUDE.md-.md` into your `CLAUDE.md`.
3. Open `Pearl Sail 3D Floor.dc.html?floor=3`, climb to the ROOF door. Or jump straight in: `Pearl Sail 3D Floor.dc.html?duel=1`, or play just the duel: `Kyoto Sword Duel.dc.html?pearl=1`.

## Files
| File | |
|---|---|
| `minigames/kyoto/duel-foxes.js` | NEW · Ben fox fighter (pose adapter + cartoon layer) · SUDS-9 model, poses, hit reactions, debris, phase damage |
| `minigames/kyoto/duel-pearl-roof.js` | NEW · the Pearl Sail roof at sunset over Meru |
| `minigames/kyoto/sword-duel.js` | duel engine · `opts.pearl` branch (Kyoto unchanged without it) |
| `Kyoto Sword Duel.dc.html` | `?pearl=1` mode: roof card, result card, fox move list, SWORD / PUNCH / KICK buttons |
| `worlds/pearl-floor3d.js` | ROOF door → duel, back to the tower on win / loss |
| `Pearl Sail 3D Floor.dc.html` | full-screen duel panel, `?duel=1`, cleared-card rows |
| `Pearl Roof Duel.html` | NEW · FOX FIGHTERS arcade: title → select your fox → VS → 3 foxes → SUDS-9 (same as `Kyoto Sword Duel.dc.html?pearl=1`) |
| `BUILD_PLAN.md` | section "PEARL SAIL · ROOF DUEL (s36)" with every change + TRY THIS |
| `PROJECT_NOTES -CLAUDE.md-.md` | one new rule line |
| `backup/kyoto/*`, `backup/pearl-sail/*` | the files from before each round (pre-foxes, pre-kick, pre-brawl, pre-supers, pre-duel) |

## Ben's moves (roof duel)
1 SWORD (jump-spin slash · down + 1 low cut) · 2 HOP PUNCH (jab · hook · UPPERCUT) · 3 SPIN KICK (down + 3 TRIP SWEEP · in the air DRILL KICK) · jump close + 1 HEAD BONK · punch ×5 fast FOX FLURRY · punch → kick → sword FOX COMBO · down → forward + PUNCH = FOX BEAM · down → back + KICK = WHIRLWIND KICK · two buttons with full power = ISSEN · hold back = guard / parry.

## Fox Fighters arcade (s36e)
Ben, Noble (chair: RAM · HORN · SPIKE WHEEL · SHOEMERANG · SPIN-OUT), King Might, Prince Max, Michelle. Hope = coming soon.

## Not built yet (ideas)
Hope as a duelist · roof music · SUDS-9 drone minions · cartoon hops / spins in the KO replay.

## s36g additions
- Throws (forward/back + PUNCH up close, tap PUNCH to break), taunts (T or two buttons), per-fox win poses + quotes, BONUS STAGE car after fox #2, per-fox arcade endings, softer hit flash (red tint + shake).
- Wrapper `Pearl Roof Duel.html` is generated from `Kyoto Sword Duel.dc.html` (pearl forced on): copy everything from `<x-dc>` to the last `</script>`, replace `pearl = /[?&]pearl=1/.test(location.search);` with `pearl = true;`.
