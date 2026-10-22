# TRACK & FIELD — 8 GATES 3D minigame

A four-event athletics meet for up to four foxes, in a toon-shaded stadium. You play **100M DASH, LONG JUMP, JAVELIN and 110M HURDLES** back to back, or any one event on its own. Places score 5, 3, 2 and 1 points, and the most points after the meet wins.

```
TrackField.dc.html                         page (UI only), loads the module
WorldTest.dc.html                          world-mode proof: a town that hosts the track
minigames/trackfield/trackfield.js         scene, rules flow, camera, input, world mode
minigames/trackfield/trackfield-rules.js   pure rules, physics constants, AI, scoring
minigames/trackfield/trackfield-audio.js   WebAudio synth sound effects + music
vendor/three/three.module.js               three.js r160 (ESM)
```

## Controls
| | Touch | Keys |
|---|---|---|
| Run | Tap **RUN** fast, or tap anywhere on the 3D view | Left/Right, A/D, Z/X, J/L (tap, don't hold) |
| Jump / throw | **Hold** JUMP or THROW, **release** at the angle you want | Space, Up or W (hold and release; or press twice) |
| Hurdle | Tap **JUMP** about two steps before each hurdle | Space |
| Skip a CPU turn | Tap **SKIP** or the 3D view | any run key |
| Next card | Card button | Space or Enter |

- **100M DASH.** Wait for the gun. Tapping during SET is a false start; a second one disqualifies you.
- **LONG JUMP.** Build speed, then hold JUMP before the white board. The angle climbs while you hold; release near **34°**. Taking off past the board is a foul. The bottom bar shows the distance to the board.
- **JAVELIN.** Hold THROW a few steps early, because you need room to stop before the line. Release near **38°**.
- **110M HURDLES.** Ten hurdles per lane. A hurdle you hit falls over and costs you speed.
- Field events give everyone two attempts, and the best one counts.

## Modes
- **VS CPU** (default): EASY = you vs **PIP** (rookie, yellow). MEDIUM = + **HOPE** (club level, blue legs, sunglasses, white cane). HARD = + **NOBLE** (master, red eyes, futuristic hover chair).
- **PASS AND PLAY**: 2 to 4 people on one device. Races run as separate heats: earlier runners appear as ghosts in their lanes. A PASS TO card appears before each turn.
- **DEMO**: HOPE and NOBLE play the meet while captions teach the controls. It loops.
- **INVITE FRIEND** shows a "coming soon" card that points to pass and play.

Rewards: gold and XP after a meet, plus a best score per difficulty, personal bests per event, and 0 to 3 stars. They're saved through `opts.save` when the world provides it, otherwise in localStorage under `trackField.*`.

## Module API
```js
import { GAME, createTrackField } from './minigames/trackfield/trackfield.js';
/* GAME = { key: 'trackField', name: 'TRACK & FIELD', maxPlayers: 4 } */
const api = await createTrackField({ container, onState, opts });
```
`opts` (all optional): `world`, `kit`, `save`, `mode` ('cpu'|'local'|'demo'), `level` (0..2), `players` (2..4), `event` ('meet'|'dash'|'long'|'jav'|'hurdles').

| Method | What it does |
|---|---|
| `hud()` | current state object (the same object `onState` gets about 10 times a second and on every change) |
| `setSafe({top,bottom,left,right})` | the pixels the page UI covers; the camera re-frames the action into the free area |
| `start(mode)` | 'cpu', 'local' or 'demo'; starts a new meet |
| `key(e)` | forward keydown (and keyup, if you have it) events here |
| `camera` | world-space camera in world mode, otherwise the local camera |
| `snapCam()` | jump the camera to its goal now |
| `destroy()` | stop the game; in world mode it removes only its group |
| `run()` `actionDown()` `actionUp()` | the RUN and JUMP/THROW buttons |
| `next()` | the card button (READY, NEXT EVENT, FINAL RESULTS, PLAY AGAIN) |
| `skip()` | fast-forward CPU turns |
| `restart()` `pause(bool)` | MENU actions |
| `setLevel(n)` `setPlayers(n)` `setEvent(key)` | menu choices; each one restarts the meet |
| `setSound(bool)` `setMusic(bool)` | audio toggles (music is off by default in world mode) |
| `stats()` | saved gold, XP and personal bests |

Main `hud()` fields: `phase`, `mode`, `level`, `eventName`, `eventNo/eventCount`, `sub`, `readLabel/readout`, `speed` (0..1), `angle` (degrees while holding) and `angleBest`, `toLine` and `lineName` (metres to the board or foul line), `toHurdle`, `banner {text, sub, tone}`, `caption`, `hint` ('run'|'action'|null), `athletes [{name,color,pts,human,active}]`, `controls {run, action, hold, skip}`, `card {kind:'event'|'meet'|'handoff', title, sub, rows, score, best, gold, stars, newBest, next}`.

## World mode
Pass `opts.world = { renderer, camera, parent }`. The game then:
- builds only the playable stadium (track, hurdles, long-jump pit, javelin sector) into a Group under `parent`. Lights, sky, grass and the stands go into a throw-away scene, so the town's lighting is untouched;
- never renders, resizes or disposes the world renderer, and reads its size from `renderer.domElement`;
- mirrors its local camera into world space every frame as `api.camera`, using the world camera's fov;
- listens for `pointerdown` on `window` in capture mode and acts only on the world canvas;
- takes keys through `api.key(e)` and adds no keydown listener of its own;
- starts with music off;
- removes its group, listeners and AudioContext in `destroy()`.

**Overlay page.** Give `TrackField.dc.html` a `world` prop and it doesn't create a game. It listens for `window` events **`8g:trackField`** (detail = hud object, or `null` when the game closes), gets the API from `world._trackField.g()`, and calls `world._trackField.end()` for BACK and LEAVE. Its root is transparent with `pointer-events: none`, so taps on the empty middle reach the 3D canvas.

**Fox kit.** When `opts.kit` is present, athletes are built with `kit.makeFox({ torso, outfit, mood })` and posed through `userData.P` (body / head / arms / legs). Without it, the game builds its own placeholder fox with the same joints.

## TRY THIS
- [ ] 390x844: the DASH starts at once. Tap RUN during SET for a false start, then win the heat.
- [ ] Leave the screen alone for 3 seconds: the hint hand appears on RUN (or on JUMP near the board).
- [ ] LONG JUMP: release at about 34° just before the board. Then hold too long and get a red FOUL.
- [ ] JAVELIN: throw too late and step over the line (FOUL). Then throw early at 38° and watch the camera follow the flight.
- [ ] HURDLES: skip a jump on purpose. The hurdle falls and your speed drops.
- [ ] MENU, then HARD: NOBLE races in the hover chair. Finish the meet and check gold, best and stars.
- [ ] MENU, then 3 FOXES: the PASS TO cards appear, and earlier runners show as ghosts in the heats.
- [ ] Rotate to 844x390: compact top bar, with JUMP bottom-left and RUN bottom-right.
- [ ] Open World Test, tap WALK TO THE TRACK, play an event, and press BACK. The status line says the group was removed.
