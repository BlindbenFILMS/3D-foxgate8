# CROQUET (8 GATES 3D minigame)

Garden croquet for up to 4 foxes. It is toon shaded with ink outlines and made for phones first. It runs as a full-screen page on its own, and it drops into the 8 GATES town on a court that is already standing there.

## Files

```
Croquet.dc.html                       the page: UI only, loads the module
World-Test.dc.html                    world-mode proof: a mini town with its own renderer + the page in overlay mode
minigames/croquet/croquet.js          the game module: scene, camera, input, turn flow, API
minigames/croquet/croquet-rules.js    pure rules, physics and AI (no three.js, runs in node)
minigames/croquet/croquet-models.js   toon materials, ink outlines, court, props, the fox adapter
minigames/croquet/croquet-audio.js    WebAudio synth sound effects + garden music
minigames/croquet/croquet-boot.js     tiny loader that hands the module to the classic-script pages
minigames/croquet/world-test.js       the mini town used by World-Test.dc.html
vendor/three/three.module.js          three.js r160 (ESM, vendored)
```

There is no build step. The files are plain ES modules with relative imports (`../../vendor/three/three.module.js`), so the folder drops into the world unchanged. To run it locally, serve the folder (`python3 -m http.server`) and open `Croquet.dc.html`.

## How to play

- Run hoops **1 to 6 in order**, through the hoop in the direction of the painted arrow, then hit the **striped peg** to win.
- **Run your hoop**: one extra stroke.
- **Roquet** (your ball hits another ball): two extra strokes. You can roquet each ball once until you run your next hoop. Extra strokes never stack past 2.
- **Out of bounds**: the ball goes back on the line and your turn ends.
- Knocking another ball through *its* hoop scores that hoop for its owner (a peel), with no bonus stroke for you.
- **Score** = 10 per hoop + 30 for the peg − 1 per stroke. **Stars** (wins only): 1 for a win, 2 at 55+, 3 at 70+. Par for the course is about 14 strokes.

## Controls

| Input | Action |
|---|---|
| Drag back from anywhere, let go | Slingshot: drag direction aims, drag length is power |
| Tap the lawn | Aim at that spot (power set to reach it) |
| Hold STRIKE, release | Power meter swings 0 to 100 to 0; let go to hit |
| Left / right buttons | Fine aim |
| COURT / AIM VIEW | Whole court or aim camera |
| Keys | Arrows or A/D aim (Shift is finer), Up/Down or W/S set power, Space or Enter starts the meter and a second press hits (in standalone, holding Space and letting go also works), V toggles the view |

A hint hand appears after 3 seconds without input.

## Modes

- **VS CPU** (default, starts at once). Difficulty sets the first opponent: EASY = **PIP** (rookie, yellow), CLUB = **HOPE** (blue legs, sunglasses, white cane, plays by feel), MASTER = **NOBLE** (futuristic hover chair, red eyes). With 2 or 3 opponents, the rest of the cast joins, each at their own level.
- **PASS AND PLAY**: 2 to 4 people on one device.
- **DEMO**: HOPE vs PIP, with captions that teach the rules. It restarts by itself.
- **INVITE FRIEND** shows a "coming soon" card (no online play yet).

The AI simulates about 100 candidate strokes through the real physics, scores each result (hoops, roquets, position for the next hoop, staying in bounds; MASTER also disrupts rivals), then adds aim and power error that depends on its level.

## Module API

```js
import { GAME, createCroquet } from './minigames/croquet/croquet.js';
/* GAME = { key: 'croquet', name: 'CROQUET', maxPlayers: 4 } */
const api = await createCroquet({ container, onState: h => {}, opts: {} });
```

`opts`:
- `world`: `{ renderer, camera, parent }` for WORLD MODE (below)
- `kit`: the world's fox kit (`makeFox`, `animFox`). Without it, the module's own placeholder foxes are used.
- `save`: `{ addGold(n), stat(key, def), setStat(key, v) }`. Without it, the game uses localStorage under `croquet.*`.
- `mode`: `'cpu' | 'local' | 'demo'` (otherwise the last mode used, then `'cpu'`)

| Method | |
|---|---|
| `hud()` | current state object (the same object `onState` gets) |
| `setSafe({top,bottom,left,right})` | px covered by page UI; the camera re-fits into the free area |
| `start(mode)` | `'cpu' \| 'local' \| 'demo'` new match |
| `key(e)` | keydown events (the world forwards them in world mode) |
| `camera` | getter: in world mode, the world-space mirror camera, else the local camera |
| `snapCam()` | jump the camera to its goal now |
| `destroy()` | stop everything; in world mode it removes only its own group |
| `restart()`, `playAgain()`, `back()` | match flow (`back()` is the standalone leave: it fires `window` event `8g:back`) |
| `chargeStart()`, `chargeEnd()`, `nudge(±1)`, `toggleView()` | controls |
| `setMode(m)`, `setLevel(0-2)`, `setOpponents(1-3)`, `setHumans(2-4)`, `setSound(b)`, `setMusic(b)` | options (they persist in `croquet.settings`) |
| `pause(b)` | freezes play while a menu is open |
| `unlockAudio()` | resume the AudioContext from a user gesture |

### HUD object (`onState`, about 10 per second plus on every change)

```js
{
  key: 'croquet', phase: 'intro'|'aim'|'think'|'swing'|'roll'|'wait'|'over'|'left', mode,
  players: [{ id, name, ball, color, kind, tag, hoops, strokes, target, done, progress: '3/7', isTurn }],
  turn: { id, name, ball, color, human, strokesLeft, target },
  message, caption,               /* message: 20 words or fewer; caption: demo teaching line */
  power, charging, aiming, canStrike, view: 'aim'|'map', hint,
  result: null | { title, won, score, best, newBest, gold, xp, stars, strokes, hoops, rows: [...] },
  settings: { mode, level, opponents, humans, sound, music }
}
```

## WORLD MODE

`createCroquet({ opts: { world: { renderer, camera, parent } } })`:

- The module creates no renderer and never calls `render`, `setSize` or `dispose`.
- Every game object (lawn, hoops, peg, corner flags, balls, foxes, mallets, markers) goes into one `Group` under `parent`, in the same local coordinates as standalone (origin = court centre, y = 0 ground, +z = player side).
- Lights, sky, hedges, trees, benches and fog are built only in standalone. In world mode the throw-away scene holds one light and is never rendered.
- The local camera uses `world.camera.fov` and the aspect of `renderer.domElement`. Every frame it is mirrored into world space, and `api.camera` returns that mirror for the world to glide onto.
- Input: `pointerdown` on `window` in capture mode, filtered to `e.target === renderer.domElement`, then `preventDefault` + `stopImmediatePropagation`. Raycasts use the local camera. No keydown listener of its own, because keys arrive via `api.key(e)`.
- Music is off by default, and sound effects stay on.
- `destroy()` cancels the frame loop, removes listeners, `parent.remove(group)` and closes the AudioContext.

### Overlay page

Give `Croquet.dc.html` a `world` prop (the walker object) and it does not create the game. It listens for `window` events **`8g:croquet`** (detail = HUD object, or `null` when the game closes), gets the API from `world._croquet.g()`, and calls `world._croquet.end()` for BACK. The root is transparent with `pointer-events: none`, so empty space passes taps through to the 3D canvas.

## TRY THIS

1. Open `Croquet.dc.html` at 390x844. A match vs HOPE starts at once. Drag back from anywhere and let go to hit through hoop 1.
2. Run hoop 1 and check that the message says "One extra stroke" and the turn stays yours.
3. Hit HOPE's ball. You should hear the click and see "ROQUET ... Two extra strokes."
4. Hit the ball over the white line. It returns to the line and your turn ends.
5. Hold STRIKE, watch the meter swing and release at about 40%. Use the left and right buttons for fine aim.
6. Wait 3 seconds without touching to see the hint hand. Tap COURT for the whole-court view.
7. MENU > MASTER / NOBLE and 3 opponents. You play all three foxes; NOBLE floats in the chair.
8. MENU > PASS AND PLAY > 3 PLAYERS. Each player gets a coloured vest that matches their ball.
9. MENU > DEMO. Watch HOPE and PIP play a whole game with teaching captions, then the results card.
10. Rotate to 844x390. The camera re-fits between the top and bottom bars.
11. Open `World-Test.dc.html`. The court sits on the plaza at (20, 0, −15), turned 0.9 rad. Play a stroke. TOWN TAPS stays 0 while the court is open. Press BACK, tap the town (red dots appear and the counter goes up), then OPEN CROQUET.
12. Finish a game vs PIP. The results card shows score, best, gold and stars; check `localStorage['croquet.gold']`.
