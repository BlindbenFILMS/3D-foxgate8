# FOX FIGHTERS · everything so far (19 Oct 2026)

## What's in this zip

| Folder | What it is |
|---|---|
| `FoxFighters/` | The whole game source, matching what is live in the Fox Fighters artifact (build s114). Open `Pearl Roof Duel.html` through a local web server. |
| `FoxFighters/Kyoto Sword Duel.dc.html` | The page source. `Pearl Roof Duel.html` is generated from it. |
| `FoxFighters/minigames/kyoto/sword-duel.js` | The fight engine: moves, stages, arcade, demo mode, audio. |
| `FoxFighters/minigames/kyoto/duel-foxes.js` | The fighters: bodies, gloves, swords, axes, lasers, Noble's chair, the robots, Slagback and the Crystal Warden. |
| `FoxFighters/audio/vo/` | All voice lines. `manifest.json` lists 610 lines; the 356 new ones are packed in `vo2pack.mp3`. |
| `FoxFighters/backup/` | Every `*.pre-sNNN.*` backup taken before each change. |
| `FighterWorkshop/` | The Fighter Workshop page plus `fighters/`: 15 fighters × 3 colours as `.glb` models, and `fighters.json`. |
| `docs/BUILD_PLAN.md` | The full build log, every session through s114. |
| `docs/FoxFighters_VO_Script_FINAL.*` | The final voice script (356 lines) in .md and .csv. |

## Importing a fighter into another game (three.js)

```js
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
const fighter = (await new GLTFLoader().loadAsync('FighterWorkshop/fighters/ben.glb')).scene;
scene.add(fighter);   // feet at y = 0, faces +Z, game units (Ben is about 2.7 tall)
```

The models hold the fight stance from the select screen. In the game the fighters are drawn with a toon shader and black ink outlines. The Fighter Workshop page shows how to get that look back: swap each material for `MeshToonMaterial` and add an inverted-hull outline.

To use the fighters **with their animations** in another 8 Gates three.js game, copy `minigames/kyoto/duel-foxes.js` with `engine/` and `fox-kit.js`. `foxFighter()` and `rigFighter()` build the live, posable bodies the duel engine drives.

## Running the game locally

```
cd FoxFighters
python3 -m http.server 8765
# open http://localhost:8765/Pearl%20Roof%20Duel.html
```
