# BUMPER CARS · 8 GATES 3D minigame

Four foxes, one rink, 75 seconds. Ram the other cars to score. Hits on a side or the back are worth more, a fast hit adds a bonus point, and the gold star doubles your points for 8 seconds. The most points when the clock hits zero wins.

Game key: `bumperCars` · max players: 4 · three.js r160 only · no build step.

## Files

```
BumperCars.dc.html                         the page (UI only; loads the module)
WorldTest.dc.html                          world-mode proof: fake town + overlay page
minigames/bumper-cars/bumper-cars.js       scene, physics, camera, input, world mode
minigames/bumper-cars/bumper-cars-rules.js pure rules + AI + cast (no three.js)
minigames/bumper-cars/bumper-cars-audio.js WebAudio synth effects + fairground loop
vendor/three/three.module.js               three.js r160 (ESM)
README.md
```
Both pages load `./support.js`, the Design Component runtime that the canvas serves. Drop the folder into the 8 GATES repo as is. The module imports `../../vendor/three/three.module.js`, the same path the world uses.

## Scoring

| Hit | Points |
|---|---|
| Front bump | 1 |
| Side bump | 2 |
| Rear bump | 3 |
| Fast hit (over 10.5 u/s closing speed) | +1 |
| Holding the gold star | x2 |

A car that was just hit can't be scored on again for 0.9 s, so nobody can farm a car pinned against the rail.

## Controls

| | Touch | Keyboard |
|---|---|---|
| Drive | Left pad: drag where you want to go (screen relative) | WASD or arrows |
| Drive (one thumb) | Hold and drag on the rink floor; your car chases your finger | |
| 1 BOOST | BOOST button (fills as it recharges, 4 s) | Space / 1 / J |
| 2 BRAKE | Hold BRAKE: stops fast, swings the tail | Shift / 2 / K |
| 3 HORN | HORN button | H / 3 / L |
| 2 PLAYERS | P1: left pad + boost. P2: right pad + boost | P1: WASD, Space boost, 2 brake, H horn. P2: arrows, Enter or 8 boost, 9 brake, 0 horn |

If there's no input for 3 seconds a hint hand shows on the pad. MENU > PAD ON/OFF toggles the on-screen pad (it's on by default on touch screens).

## Modes and cast

- **VS CPU** (default; starts as soon as the page loads): YOU vs PIP, HOPE and NOBLE. Difficulty (MENU) maps to the cast: **PIP · EASY**, **HOPE · MEDIUM**, **NOBLE · HARD**. Difficulty sets every rival's top speed, aim, reaction time and how often they boost. PIP is a touch below that, NOBLE a touch above.
  - PIP: rookie, yellow car.
  - HOPE: blue car, blue legs, sunglasses and her white cane in the car. She drives by ear: any horn pulls her straight to it.
  - NOBLE: hover chair with a red glow ring, red eyes. He aims for back bumpers.
- **2 PLAYERS**: two people on one device (YOU and P2), plus PIP and HOPE. There are no turns because it's a real-time game, so pass and play here means sharing one screen.
- **DEMO**: four AI foxes play while captions teach the rules. It loops by itself; PLAY NOW jumps into VS CPU.
- Online play isn't built yet. INVITE FRIEND shows a "coming soon" card that points to 2 PLAYERS.

## Rewards and save

VS CPU only. A win pays `15 x level + 2 x score` gold. Other places pay `score x level / 2`. XP is `10 + 2 x score`, plus `20 x level` for a win. Stars: 1 for 3+ points, 2 for 8+, 3 for 14+, and a win always gets at least 1. Through `opts.save` when it's given: `save.addGold(n)`, `save.stat('bumperCars.best', 0)`, `save.setStat(...)`. Without it they go to localStorage under `bumperCars.*`. Keys: `best, gold, xp, stars[3], played, wins, level, sound, music`.

## Module API

```js
import { GAME, createBumperCars } from './minigames/bumper-cars/bumper-cars.js';
/* GAME = { key: 'bumperCars', name: 'BUMPER CARS', maxPlayers: 4 } */
const api = await createBumperCars({ container, onState, opts });
```

`opts`: `world` (see below) · `kit` (the world's fox maker) · `save` · `mode` ('cpu' | 'local' | 'demo') · `level` (0..2) · `roundTime` (seconds, for testing).

| Method | What it does |
|---|---|
| `hud()` | current state object (the same one `onState` sends) |
| `setSafe({top,bottom,left,right})` | px covered by page UI; the camera re-fits the rink into the free area |
| `start(mode)` | 'cpu' / 'local' / 'demo' (rebuilds the cars, starts the countdown) |
| `restart()` | same mode again |
| `key(e)` | forward keydown (and keyup if you have it) in world mode |
| `camera` | world mode: the world-space camera to glide to. Standalone: the normal camera |
| `snapCam()` | jump the camera to its goal |
| `stick(p, x, y)` | pad vector for player p, -1..1, y down = toward the player |
| `btn(p, 'boost' or 'brake' or 'horn', down)` | button press or release |
| `boost(p)`, `horn(p)` | one-shot shortcuts |
| `pause(on)` / `menu(open)` | freeze while a card is open |
| `setLevel(i)`, `setMode(m)`, `setSound(on)`, `setMusic(on)` | options |
| `leave()` | standalone BACK: stops play, hud.phase = 'left' |
| `destroy()` | stop the loop, remove listeners, close audio; world mode removes only its group |

### HUD object (about 10 times a second, plus at once on any change)

```js
{ key, name, phase /* 'count' | 'play' | 'over' | 'left' */, mode, paused, world, touch,
  level, levelKey, levelLabel, boss, time, timeFrac, count /* 3,2,1 */, go /* true just after start */,
  players: [{ id, name, color, score, human /* 0, 1 or -1 */, star, boost /* 0..1 recharge */, boosting, leader }],
  humans, msg: { text, id }, caption /* demo only */, hint, sound, music, best, online: false,
  result: null | { title, win, place, score, best, newBest, gold, xp, stars, rows: [{ name, color, score, place, human }], demo, mode } }
```

## World mode

Pass `opts.world = { renderer, camera, parent }`:
- No renderer of its own. The game builds into `new THREE.Group()` added to `parent`: the rink floor, striped rail, skirt, corner posts, sign, cars, foxes, sparks and star. Lights, the tent walls, ground, string lights, fog and background go into a throw-away scene, so the town lighting is untouched.
- The local camera uses `world.camera.fov`, takes its aspect from `world.renderer.domElement` every frame, and is mirrored to world space as `api.camera`.
- Input: a capture `pointerdown` on `window`. It reacts only when `e.target === renderer.domElement`, then calls `preventDefault()` and `stopImmediatePropagation()`. Raycasts use the local camera. There's no window keydown listener of its own, so keys come through `api.key(e)`. When only keydown arrives, a held key counts as held for 0.6 s per repeat.
- Music is off by default. Sound effects stay on.
- `destroy()` removes the group from `parent` and leaves the world renderer alone.

### Overlay page

Mount `BumperCars.dc.html` with the prop `world` (the walker object). It then doesn't create a game. It listens for `window` event **`8g:bumperCars`** (detail = the hud, or `null` when the game closes), gets the API from `world._bumperCars.g()`, and calls `world._bumperCars.end()` for BACK. The root is transparent with `pointer-events: none`, so empty space passes taps to the 3D canvas. The world needs to dispatch the event from `onState`:

```js
const api = await createBumperCars({ container, opts: { world: { renderer, camera, parent }, kit, save },
  onState: h => window.dispatchEvent(new CustomEvent('8g:bumperCars', { detail: h })) });
walker._bumperCars = { g: () => api, end: () => { api.destroy(); window.dispatchEvent(new CustomEvent('8g:bumperCars', { detail: null })); } };
```

## Fox adapter

`makeFox(cast)` calls `opts.kit.makeFox({ torso, outfit, mood })` when the kit is present and its fox has `userData.P`. Otherwise it builds a placeholder fox with the same joints (body / head / arms[2] / legs[2], about 2.8 units tall). Drivers are scaled to 0.68 and posed seated through `userData.P` only: legs forward, hands on the wheel, the head turning with the steering and jolting on hits.

## Performance

No shadow maps. Blob shadows sit under the cars. Each car body is one merged vertex-colour mesh plus one inflated ink shell. Two lights. About 100 draw calls with placeholder foxes. On touch devices antialias is off and the pixel ratio is capped at 1.75.

## TRY THIS

- [ ] Open `BumperCars.dc.html` at 390x844 and 844x390. The rink sits in the free space between the top bar and the controls, and it re-fits when you rotate.
- [ ] Add `#quick` to the page URL for a 15-second round, so you reach the results card fast.
- [ ] Drag the pad and drive into a rival's side: the toast reads SIDE BUMP +2.
- [ ] Hit someone from behind for +3. Boost into them for the BIG bonus.
- [ ] Grab the gold star: a star shows over your car and in your score chip, and points double.
- [ ] Honk near HOPE and watch her turn toward you.
- [ ] Hold BRAKE and steer to spin round.
- [ ] Leave the screen alone for 3 seconds: the hint hand appears.
- [ ] MENU: switch to NOBLE · HARD, 2 PLAYERS and DEMO; toggle sound, music and the pad.
- [ ] Win a round and check that gold, XP, stars and NEW BEST show on the results card.
- [ ] Open `WorldTest.dc.html`: the rink is in the rotated spot in town and the camera glides in. Tapping the rink doesn't raise TOWN TAPS. BACK destroys the game, the camera glides back to the street, and tapping the town counts again. ENTER BUMPER CARS rebuilds it.
