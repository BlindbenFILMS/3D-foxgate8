# CAR WASH (8 GATES 3D minigame)

A toon-shaded car wash. A muddy car rolls into your bay and you drag across it to clean it in three steps: **SOAP** the mud, **RINSE** the foam, **DRY** the water drops. The tool changes by itself when a step is done. A clean car flashes, drives off with a tip, and the next car rolls in. You have 60 seconds to wash as many cars as you can.

## Files

```
Main.dc.html                         the page (CAR WASH). UI only, loads the module. Rename to "Car Wash.dc.html" if your world wants the game name.
World-Test.dc.html                   world-mode test: a small town, the bays on a rotated parent, the page in overlay mode
minigames/carwash/carwash.js         game module: scene, cars, foxes, camera, input, loop
minigames/carwash/carwash-rules.js   pure rules + AI (no three.js): spots, scoring, stars, gold, CPU washers
minigames/carwash/carwash-audio.js   WebAudio synth: spray hiss per tool, pops, chimes, music loop
vendor/three/three.module.js         three.js r160
```

## Controls

- **Touch / mouse:** press and drag over the car. The spray follows your finger, and dirt under the yellow ring gets cleaned.
- **Keys:** arrow keys move the ring, **N** jumps to the nearest dirty spot, **SPACE** or **ENTER** sprays (hold it to keep spraying).
- If you stop for 3 seconds, a hand points at the next dirty spot.

## Modes

- **VS CPU** (default; the game starts right away): you wash in bay 1 while the CPU washes in bay 2. Most points after 60 s wins.
  - **PIP** (rookie, yellow): slow, picks spots at random and pauses a lot.
  - **HOPE** (club, blue legs, sunglasses, white cane): works by feel, from left to right.
  - **NOBLE** (master, hover chair, red eyes): fast, always takes the nearest spot.
- **PASS AND PLAY** (2 to 4 players): each player gets a 40 s turn in bay 1, and a "PASS TO P2" card sits between turns.
- **DEMO:** HOPE and NOBLE wash while captions explain the game. Tap the screen to start a VS CPU game.

Scoring: each car is worth 100 points plus a speed tip (up to +60). A half-washed car at the buzzer counts for up to 50. Stars come at 250, 500 and 800 points, scaled by turn length. Gold and XP are paid out on the results card. They save through `opts.save` when it is given, otherwise to localStorage under `carWash.*` (`best`, `gold`, `xp`, `played`).

## Module API

```js
import { GAME, createCarWash } from './minigames/carwash/carwash.js';
/* GAME = { key: 'carWash', name: 'CAR WASH', maxPlayers: 4 } */
const api = await createCarWash({ container, onState: h => {}, opts: {
  world,          /* { renderer, camera, parent } for world mode */
  kit,            /* world fox kit: kit.makeFox(...), kit.animFox(...) */
  save,           /* { addGold(n), stat(key, def), setStat(key, v) } */
  level,          /* 'easy' | 'medium' | 'hard' (default 'medium') */
  music, sound,   /* false turns them off; music is off by default in world mode */
  timeScale       /* test hook: >1 runs the game faster */
}});
```

| method | does |
|---|---|
| `hud()` | the current state object (the same one `onState` gets) |
| `setSafe({top,bottom,left,right})` | px covered by the page UI; the camera re-fits the action into the free area |
| `start(mode)` | `'cpu'`, `'local'` or `'demo'` |
| `restart()` / `playAgain()` | restart the current mode (playAgain turns DEMO into VS CPU) |
| `ready()` | PASS AND PLAY: the next player starts |
| `setLevel(l)` | `'easy'`, `'medium'` or `'hard'` (restarts a VS CPU game) |
| `setPlayers(n)` | 2 to 4 (restarts a PASS AND PLAY game) |
| `pause(on)` | freezes play while a card is open |
| `setSound(on)`, `setMusic(on)`, `toggleSound()`, `toggleMusic()` | audio |
| `key(e)` | keydown events (the world forwards these) |
| `camera` | world mode: the world-space camera to glide onto; standalone: the game camera |
| `snapCam()` | jump the camera to its goal |
| `destroy()` | stop the loop, remove listeners, close audio; in world mode remove only the game group |

`onState(h)` fires about 10 times a second, and at once on any change:

```js
{ key, name, phase /* intro | play | turn | result | over */, mode, level, levelName, levelTag,
  players, turn, turnName, nextName, time, timeMax,
  tool /* SOAP | RINSE | DRY */, toolIdx /* 0..2, 3 = car done */, carPct,
  rows: [{ name, score, cars, active, cpu, pct }],
  msg, msgId, caption, hint /* {x,y} px or null */, best, sound, music, paused, world,
  result: { title, win, score, best, newBest, gold, xp, stars, rows } | null }
```

## World mode

When `opts.world` is passed, the module adds one `THREE.Group` (two wash bays, the cars, foxes and spray) to `world.parent`, in local coordinates: the origin is bay 1's car spot, y = 0 is the ground, +z is the player's side, and bay 2 is at x = +14. Lights, the parking lot, the back wall and the sky go into a throw-away scene. The module never renders. It mirrors its local camera into `api.camera` every frame and reads the size from `world.renderer.domElement`. Pointer input is caught on `window` in capture mode and only acts on the world canvas. Music is off.

**Page overlay mode:** mount `Main.dc.html` with a `world` prop (the walker). It does not create the game. It listens for `window` events **`8g:carWash`** (`detail` = the hud object, or `null` when the game closes), gets the API from `world._carWash.g()`, and calls `world._carWash.end()` for BACK and LEAVE. The root is transparent with `pointer-events: none`, so taps in the middle reach the 3D canvas.

The world wires it like this (World-Test.dc.html does exactly this):

```js
const api = await createCarWash({ container, opts: { world: { renderer, camera, parent }, kit, save },
  onState: h => window.dispatchEvent(new CustomEvent('8g:carWash', { detail: h })) });
walker._carWash = { g: () => api, end: () => { api.destroy(); window.dispatchEvent(new CustomEvent('8g:carWash', { detail: null })); } };
```

## TRY THIS

- [ ] Open Main at 390x844: the game starts at once, and after 3 s of no input a hand points at the mud.
- [ ] Drag over every mud spot. The tool flips to RINSE, then DRY, and the car flashes and drives off with "+1xx SPARKLING!".
- [ ] Turn to 844x390: both bays fit, the top and bottom bars each fold into one row, and the cars stay clear of them.
- [ ] MENU, then NOBLE: you lose unless you are quick. PIP is beatable by anyone.
- [ ] MENU, then PASS AND PLAY, then 3 PLAYERS: you get three 40 s turns with a pass card between them, then a ranked results card.
- [ ] MENU, then DEMO: the captions cycle. Tap the canvas to jump into VS CPU.
- [ ] Keyboard: N, then hold SPACE, and repeat. You can clean a whole car without the mouse.
- [ ] World Test: the bays sit rotated in the town, the camera glides onto them, BACK closes the game and the camera glides home, and OPEN CAR WASH brings it back.
- [ ] Results card: score, best (NEW BEST in yellow), gold won, XP, PLAY AGAIN, BACK.

Tested headless at 390x844, 844x390 and 1280x800, plus world mode on a rotated parent, with no console errors. Phone budget: no shadow maps, two lights, instanced dirt and spray. With both bays full there are about 155 draw calls standalone (lot included) and about 145 in world mode, and fewer in portrait PASS AND PLAY.
