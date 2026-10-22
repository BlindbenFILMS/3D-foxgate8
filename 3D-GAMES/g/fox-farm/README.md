# FOX FARM (8 GATES 3D minigame)

Plant seeds, water them, pick what grows. Corn, carrots and lettuce in a harvest race between fox farmers.
Game key: `farmField`. Up to 4 players.

## Files

```
Main.dc.html                      the page (UI only). The Design canvas needs the entry board named Main; rename to "Fox Farm.dc.html" if you like
WorldTest.dc.html                 world-mode test: own renderer + tiny town, the game in a parent Group, the page in overlay mode
minigames/farm/farm.js            the module: scene, camera, input, API, world mode
minigames/farm/farm-rules.js      pure rules + AI (no three.js, runs in node)
minigames/farm/farm-models.js     toon materials, ink outlines, instanced crops, fox adapter, crows, the room
minigames/farm/farm-audio.js      WebAudio synth sound effects + music loop
vendor/three/three.module.js      three.js r160
test-standalone.html              plain HTML harness (no Design runtime): ?mode=cpu|local|demo&ts=1
test-world.html                   plain HTML world-mode harness
```

## How to play

- **Tap bare soil** to plant the selected seed. Your fox walks over and does the job. You can line up 6 jobs; tap a marked tile again to cancel.
- **Blue drop** = thirsty. Tap it to water. Crops do not grow while thirsty. Lettuce needs 1 drink, carrots and corn need 2.
- **Spinning star** = ripe. Tap to pick it. After 8 seconds it wilts (the star blinks red first). Tap wilted crops to clear them.
- **Crows** land on ripe crops. Tap the crow (or its tile) to shoo it, or it eats the crop.
- **Golden crops** (8% chance) score double.
- **Salad bowl**: pick one corn, one carrot and one lettuce for +6.

| Crop | Grows | Points | Water |
|---|---|---|---|
| CORN | 16 s | 5 | 2 |
| CARROT | 10 s | 3 | 2 |
| LETTUCE | 6 s | 2 | 1 |

### Controls
- Touch / mouse: tap tiles. Seed buttons CORN / CARROT / LETTUCE.
- Keys: arrows or WASD move the cursor, SPACE / ENTER acts, 1 2 3 pick a seed, ESC opens MENU.

### Modes
- **VS CPU** (default, 90 s season): 1 to 3 opponents. Level picks the first one: PIP (rookie, yellow), HOPE (club, blue legs, sunglasses, white cane, taps her way by feel), NOBLE (master, hover chair, red eyes). Extra opponents are the next foxes in that order, each at their own level.
- **PASS AND PLAY**: 2 to 4 players, one 60 s season each on their own plot, then the scores are compared.
- **DEMO**: HOPE vs NOBLE with teaching captions. Tap to jump into a game against PIP.

Rewards (VS CPU): gold = 10 + score/4 on a win (score/10 on a loss), XP = score (+20 on a win), stars at 25 / 55 / 85 points, best score. Saved via `opts.save` when given, else localStorage `farmField.*`.

## Module API

```js
import { GAME, createFarm } from './minigames/farm/farm.js';
GAME = { key: 'farmField', name: 'FOX FARM', maxPlayers: 4 }
const api = await createFarm({ container, onState, opts });
```

`opts`: `mode` ('cpu' | 'local' | 'demo'), `world` ({ renderer, camera, parent }), `kit` (fox maker: `makeFox`, `animFox`), `save` (`addGold`, `stat`, `setStat`), `timeScale` (testing only).

| Method | |
|---|---|
| `hud()` | current state object (same as `onState`) |
| `setSafe({top,bottom,left,right})` | px covered by page UI; camera re-fits the farm into the free area |
| `start(mode)` | 'cpu', 'local', 'demo' |
| `key(e)` | forward keydown events (world mode) |
| `camera` | world-space camera in world mode, else the normal camera |
| `snapCam()` | jump the camera to its goal |
| `destroy()` | stop, remove listeners; world mode removes only its group |
| `setSeed(k)` | 'corn', 'carrot', 'lettuce' |
| `setLevel(l)` | 'pip', 'hope', 'noble' (restarts a CPU game) |
| `setOpponents(n)` | 1 to 3 |
| `setLocalPlayers(n)` | 2 to 4 |
| `pause(on)` · `ready()` · `restart()` · `playAgain()` · `back()` | page buttons |
| `setSound(on)` · `setMusic(on)` · `unlock()` | audio (music is off by default in world mode) |
| `tap(x, y)` | tap at container px (for tests) |

### HUD object (`onState`, about 10 times a second)
`phase` ('play' | 'turn' | 'over' | 'left'), `mode`, `level`, `opponents`, `localPlayers`, `paused`, `time`, `seconds`, `seed`, `seeds[]`, `players[]` ({name, score, color, you, active, salads}), `you`, `bowl` ({corn, carrot, lettuce}), `queue`, `msg`, `caption` (demo), `hint` ({x, y, act} after 3 s idle), `turn` (pass and play), `result` ({title, won, place, score, best, newBest, gold, xp, stars, rows[]}), `sound`, `music`, `menuReq` (ESC counter), `best`.

## World mode

`opts.world = { renderer, camera, parent }`: no renderer of its own, the playable farm goes into a Group under `parent` (origin = centre of the farm, y = 0 ground, +z = player side). Lights, sky, corn fields, barn and hills are only built in standalone. Pointer input: `window` pointerdown in capture mode, only when the target is the world canvas. Keys arrive through `api.key(e)`.

**Overlay page**: give the page a `world` prop. It does not create the game: it listens for `window` events `8g:farmField` (detail = hud, or null when the game closes), gets the API from `world._farmField.g()`, and calls `world._farmField.end()` for BACK.

## Performance
Crops, beds, drops and stars are instanced (one draw call per part). About 80 to 110 draw calls with 4 players. No shadow maps. Corn-field backdrop is capped on touch devices.

## TRY THIS
- [ ] Phone portrait 390x844: plots stack front to back; seed buttons + MENU / INVITE FRIEND / BACK at the bottom.
- [ ] Phone landscape 844x390: plots side by side; buttons move to a right column; camera re-fits.
- [ ] Wait 3 s without touching: a hint hand points at the best tile.
- [ ] Plant corn, carrot and lettuce, water them twice, pick all three: SALAD +6.
- [ ] Let a ripe crop sit: star blinks red, then it wilts. Clear it.
- [ ] Shoo a crow before it eats.
- [ ] MENU: switch to NOBLE with 3 opponents (4 plots). Try SOUND / MUSIC.
- [ ] PASS AND PLAY with 3 players: READY card between seasons, results at the end.
- [ ] DEMO: captions teach; tap to play.
- [ ] Results card: score, best, gold, stars, PLAY AGAIN, BACK.
- [ ] WorldTest: farm sits rotated in the town, overlay HUD works, taps reach the farm, BACK removes only the farm group, OPEN FOX FARM brings it back.
