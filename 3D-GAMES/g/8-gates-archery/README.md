# 8 GATES 3D · ARCHERY

A toon-shaded archery range for the 8 GATES town. Each player shoots 3 arrows per end over 4 ends, with the target moving back each end: 12, 18, 24 and 30 m. There's wind, arrow drop, a draw meter, and foxes that walk up to the line and draw a real bow string. It runs full screen on its own, or on a range already standing in the 3D town with no page change.

## Files

```
Archery.dc.html                       the page (UI only; loads the module)
World-Test.dc.html                    world-mode proof: own town renderer + overlay page
minigames/archery/archery.js          scene, flow, camera fit, input, API      (~58 KB)
minigames/archery/archery-rules.js    pure rules + CPU AI, no three.js          (~5 KB)
minigames/archery/archery-audio.js    WebAudio synth effects + music            (~6 KB)
vendor/three/three.module.js          three.js r160 (ESM)
```
The page name has no space: `World-Test.dc.html`, because the canvas doesn't allow spaces in file names.

## Controls

| Input | Action |
|---|---|
| Press and hold anywhere on the range | Start drawing the bow (the meter fills in about 0.85 s) |
| Drag while holding | Move the sight (the ring on the target) |
| Let go | Shoot. A tap shorter than about 0.2 s cancels and keeps your aim |
| Space / Enter | Press to draw, press again (or release) to shoot |
| Arrow keys / WASD | Nudge the sight (Shift for fine steps) |

The sight is set for full draw at the current distance. A full-draw arrow with no wind lands on the ring. A short draw drops low. Wind (the red flag and the wind sock, plus the arrow in the HUD) pushes arrows sideways, so aim into it. If you hold full draw for more than 2.4 s your arms start to shake, and at 5 s the arrow slips.

**Aim tone** (MENU > SETTINGS): an audio sight. While you draw, a soft tone rises in pitch as your predicted landing point nears the gold, with wind and draw strength taken into account. HOPE plays this way: during her draw you hear her ticks speed up as she settles.

## Modes and cast

- **VS CPU**: you against PIP (rookie, yellow), HOPE (club level, blue legs, sunglasses, white cane, shoots by feel) or NOBLE (master, hover chair, red eyes).
- **PASS & PLAY**: 2 to 4 players on one device. The game says whose turn it is ("PASS THE DEVICE TO P2").
- **DEMO**: PIP against HOPE, with captions that teach the rules. It restarts on its own.
- Online play isn't built yet. INVITE FRIEND shows a "coming soon" card with a shortcut to Pass & Play.

Scoring: rings 10 to 1, M for a miss. The inner X counts 10 and breaks ties (then 10s). The top score is 120.
Rewards: gold and XP on a win (PIP 10, HOPE 20, NOBLE 40 gold, plus total / 10). Half gold for a draw. Pass & Play pays 5. The game also tracks best score and stars (1 star at 50%, 2 at 70%, 3 at 85% of 120).
Saves go through `opts.save` when given (`addGold`, `stat`, `setStat`, under keys `archeryRange.best`, `archeryRange.xp`, `archeryRange.wins.<level>`). Without it, they go to localStorage under `archeryRange.*`.

## API

```js
import { GAME, createArchery } from './minigames/archery/archery.js';
GAME  /* { key: 'archeryRange', name: 'ARCHERY', maxPlayers: 4 } */

const api = await createArchery({ container, onState, opts });
```

`opts`: `world` ({ renderer, camera, parent }), `kit` (fox maker), `save`, `mode` ('cpu'|'local'|'demo'), `level` ('pip'|'hope'|'noble'), `players` (2 to 4, for local), `music` (default true standalone, false in world), `aimTone`.

| Method | What it does |
|---|---|
| `hud()` | Current state (the same object `onState` gets about 10x a second, 20x while drawing, and at once on changes) |
| `setSafe({top,bottom,left,right})` | Pixels the page UI covers; the camera re-fits into the free area |
| `start(mode, {level, players})` | Start a new match ('cpu' / 'local' / 'demo') |
| `key(e)` | Forward a keydown (and optionally keyup) event |
| `camera` | Getter. World mode returns the world-space mirror camera; standalone returns the local camera |
| `snapCam()` | Jump the camera to its goal now |
| `destroy()` | Stop, remove listeners, close audio. In world mode it removes only its own group |
| `restart()`, `playAgain()` | Replay the same mode |
| `pause(bool)`, `leave()` | Freeze for menus; `leave()` freezes and sets `hud.left` (standalone BACK) |
| `setLevel(l)`, `setPlayers(n)` | Set options for the next `start` |
| `setSound(b)`, `setMusic(b)`, `setAimTone(b)` | Settings |
| `draw()`, `loose()`, `nudge(dx,dy)` | Button or switch driven shooting (for assistive input) |
| `unlockAudio()` | Call from a user gesture to start WebAudio |

`hud` fields: `phase` (walk / aim / draw / flight / hit / endsum / result), `mode`, `level`, `end`, `ends`, `arrow`, `dist`, `wind {value, kmh, dir}`, `players [{name,color,kind,total,active,arrows[]}]`, `shooter`, `humanTurn`, `power`, `drawing`, `full`, `overdraw`, `message`, `caption`, `last {label,color,ring}`, `say` (screen-reader line), `hint`, `result {title,score,max,best,newBest,gold,xp,stars,rows[]}`, `left`, `paused`, `sound`, `music`, `aimTone`.

## World mode

`opts.world = { renderer, camera, parent }`:
- The module builds the lane, shooting line, distance posts, target, foxes and bows into a `Group` under `parent`. It adds no lights, sky, fog, room or trees, never renders, and never touches the world camera.
- `api.camera` is a world-space mirror of the local camera, with fov = `world.camera.fov` and aspect from the canvas. Glide the town camera onto it.
- Input: `pointerdown` on `window` in capture mode, acting only when the target is the world canvas, then `preventDefault()` + `stopImmediatePropagation()`. Keys come only through `api.key(e)`.
- Music is off by default; sound effects stay on.

### Overlay page

Mount `Archery.dc.html` with a prop `world` (the walker object) and it does **not** create the game. Instead it:
- listens for `window` events `8g:archeryRange` (`detail` = hud object, or `null` when the game closes),
- gets the API from `world._archeryRange.g()`,
- calls `world._archeryRange.end()` for BACK.

The root is transparent with `pointer-events: none`, so empty space passes taps through to the 3D canvas. The top and bottom bars are marked `data-safe` and measured into `setSafe`.

### Fox kit

When `opts.kit.makeFox` exists, it is used with `{ torso, outfit, mood }`. The pose code expects `userData.P = { body, head, arms[2], legs[2] }` with arms and legs hanging along -Y and the fox facing +Z. **It also assumes `arms[0]` is the fox's LEFT (bow) arm.** If the kit uses the other order, swap the indices in `updateActors`. `kit.animFox(fox, dt, speed)` drives walking and idling. Aim and cheer poses are applied on top of it.

## TRY THIS

- [ ] Open at 390x844: MENU / INVITE FRIEND / BACK on top, the scoreboard below them, and the draw meter and message at the bottom. The target stays in the clear middle.
- [ ] Turn to 844x390: the camera re-fits and nothing hides behind the bars.
- [ ] Wait 3 s on your turn: the hint hand appears ("HOLD, DRAG TO AIM, LET GO").
- [ ] Hold and drag: the view zooms to the target, the ring shrinks as you draw, and the meter goes yellow at FULL DRAW.
- [ ] Hold at full draw for 3 s: the sight shakes, the meter label blinks SHAKING.
- [ ] Shoot a short draw at 30 m: the arrow drops low.
- [ ] End 3 or 4 with a strong wind: aim into the flag and watch the drift.
- [ ] Turn on AIM TONE and close your eyes: steer the pitch up and let go.
- [ ] Play NOBLE (hover chair, red eyes). Lose gracefully.
- [ ] PASS & PLAY with 4: four foxes on the bench, "PASS THE DEVICE TO P3".
- [ ] DEMO: watch PIP and HOPE while the captions teach.
- [ ] Finish a match: the results card shows score, best, gold, XP and stars, with PLAY AGAIN and BACK.
- [ ] World Test page: the range sits rotated in the town, the town camera glides onto the game, and taps go to the game. BACK closes it, and "WALK BACK TO THE RANGE" reopens it.
