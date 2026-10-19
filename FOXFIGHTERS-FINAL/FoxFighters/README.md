# PEARL SAIL · ROOF DUEL — package for a new DUEL chat

## How to use
1. Make a new project (or a new chat in this one), attach / upload this whole folder so the paths stay the same.
2. Rename `PROJECT_NOTES (CLAUDE.md).md` back to `CLAUDE.md` at the project root (it holds the project rules).
3. Say: **"continue BUILD_PLAN.md: build the Pearl Sail ROOF DUEL from PEARL SAIL ROOF DUEL HANDOFF.md"**

## What's inside
- `PEARL SAIL ROOF DUEL HANDOFF.md` — the plan: Ben / Noble / Hope foxes + SUDS-9 in the Kyoto Sword Duel engine, Pearl roof stage looking down on Meru, the hook-up into the 3D tower, Ben's questions.
- `BUILD_PLAN.md` — full project history (Kyoto Sword Duel + Pearl Sail sections are the relevant ones).
- THE DUEL: `Kyoto Sword Duel.dc.html`, `Kyoto Sword Duel Phone Preview.dc.html`, `minigames/kyoto/*`, `engine/human-kit.js`, `engine/restaurant-kit.js`, `engine/duel-net.js`, `vendor/trystero-nostr.js`.
- THE CAST (foxes): `fox-kit.js`, `engine/cast.js`, `engine/cane.js` + `presets/cane.json` (Hope), `engine/chair.js` + `presets/chair.json` (Noble), `engine/hope-weapons.js`, `engine/noble-weapons.js`, workshops `Fox / Cane / Noble Workshop.dc.html`.
- THE TOWER: `Pearl Sail 3D Floor.dc.html` + `worlds/pearl-floor3d.js` (3D floors, ROOF door), `worlds/pearl-bots.js` + `Pearl Sail Bot Workshop.dc.html` (bot look), `Pearl Sail Tower.dc.html` + `worlds/pearl-sail.js` (side-on tower with the original SUDS-9 boss).
- SHARED: `Game HUD.dc.html`, `Welcome Card.dc.html`, `support.js`, `engine/save.js`, `vendor/three`, `_ds/` (Modernist design system), plus the Meru files the fox kit imports (`meru-game.js`, `worlds/meru*.js`, json + map) so every page runs as is.
- MERU BACKDROP reference: `worlds/meru2-city.js` + `worlds/meru2-flora.js` (landmarks + colours for the roof view).

Entry points to open first: `Kyoto Sword Duel.dc.html` · `Pearl Sail 3D Floor.dc.html?floor=3` · `Fox Workshop.dc.html`.
