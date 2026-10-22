# PLAYGROUND (8 GATES 3D minigame)

A four-event playground championship for up to 4 foxes, all one-thumb timing taps:

| # | Event | Tap when | Winner |
|---|-------|----------|--------|
| 1 | SWINGS | the marker is in yellow, at the back of the swing (one pump per swing) | highest swing in 15 s |
| 2 | MONKEY BARS | the marker is in yellow as you swing forward (grab the next bar; a miss = slip) | fastest across 7 grabs |
| 3 | MERRY-GO-ROUND | the outward pull reaches yellow (pull in; too early twice = lose grip) | last fox holding on (30 s max) |
| 4 | SANDBOX | the sweeping marker is in yellow (pack a bucket; sloppy layers wobble, too much wobble = crumble, half points) | best castle score (6 buckets, flag on top) |

Event points: 5 / 3 / 2 / 1 (ties share). Most points after 4 events is champion.
Every event also plays a **tick sound** the moment the yellow window opens, so it can be played by ear.

## Controls
- Tap anywhere on the 3D view, or the big yellow button, or press **Space / Enter / J / 1**. **R** restarts.
- MENU: mode, opponent, number of foxes, sound, music, rules, restart, leave. INVITE FRIEND: "coming soon" card. BACK: leave.
- A hint hand points at the button after 3 s without input.

## Modes
- **VS CPU** (default): you + up to 3 AI. Opponent picks the level: **PIP** (easy, rookie, yellow) · **HOPE** (medium, club, blue legs, sunglasses, white cane) · **NOBLE** (hard, master, hover chair, red eyes). The picked rival is the strongest; the other two fill in.
- **PASS & PLAY**: 2-4 players take turns on each event ("FOX 2, your turn. Tap to start.").
- **DEMO**: PIP vs HOPE with teaching captions; loops. Tap PLAY NOW to jump in.

## Rewards
Win VS CPU: gold `20 + 15*level + 5*events won`, XP `40 + 20*level + 5*points`, stars 3/2/1 for 1st/2nd/3rd.
Saved with `opts.save` (`addGold`, `stat`, `setStat`) when given, else localStorage:
`playground.best`, `playground.gold`, `playground.xp`, `playground.stars`, `playground.best.swings|bars|spin|sand`.

## Files
```
Playground.dc.html                      page (UI only)
World-Test.dc.html                      world-mode test (fake town + overlay page)
minigames/playground/playground.js      scene, flow, camera, input, world mode, API
minigames/playground/playground-rules.js  pure rules + AI + cast (no three.js)
minigames/playground/playground-build.js  toon look, merged meshes, stations, fox adapter
minigames/playground/playground-audio.js  WebAudio synth sfx + music
vendor/three/three.module.js            three.js r160
```
Note: the Design canvas does not allow spaces in file names, so the brief's `World Test.dc.html` is `World-Test.dc.html` here.

## API
```js
import { GAME, createPlayground } from './minigames/playground/playground.js';
// GAME = { key: 'playground', name: 'PLAYGROUND', maxPlayers: 4 }
const g = await createPlayground({ container, onState, opts });
```
`opts`: `world` ({ renderer, camera, parent }), `kit` ({ makeFox, animFox }), `save`, `mode` ('cpu'|'local'|'demo'), `level` (0-2), `music` (false to mute), `timeScale` (test only).

| method | what it does |
|---|---|
| `hud()` | current state object (the same thing `onState` sends ~10/s, 30/s during play, and at once on changes) |
| `setSafe({top,bottom,left,right})` | px covered by page UI; camera re-fits the action into the free area |
| `start(mode)` | 'cpu' / 'local' / 'demo', restarts the championship |
| `key(e)` | keydown forwarded by the world |
| `camera` | world-space camera in world mode, else the local camera |
| `snapCam()` | jump camera to goal |
| `destroy()` | stop, remove listeners; in world mode removes only its group |
| `action()` / `tap()` | the one game button |
| `restart()`, `playAgain()`, `leave()` | flow |
| `setLevel(0-2)`, `setFoxes(2-4)` | opponent / field size (players in PASS & PLAY); restarts |
| `setSound(b)`, `setMusic(b)`, `pause(b)` | settings; MENU pauses the game |
| `invite()`, `rules()` | `{ online:false }`, rules text |

### hud() shape
`phase` (intro, turn, count, play, turnEnd, eventEnd, result, left), `mode`, `level`, `levelName`, `rival`, `foxes`, `localPlayers`, `eventIndex`, `eventCount`, `eventKey`, `eventName`, `verb`, `hint`, `goal`, `timerText`, `countdown`, `caption {who,text}`, `players[] {name,color,human,pts,place,placeText,score,active,out,done,turn}`, `turn`, `turnName`, `meter {v,lo,hi,idle,flash}`, `idleHint`, `actionLabel`, `canAct`, `eventResult[]`, `result {title,win,pts,best,newBest,gold,xp,stars,standings[],note}`, `sound`, `music`, `online`, `world`, `gold`, `rules[]`, `paused`.

## World mode
`opts.world = { renderer, camera, parent }`: no own renderer; everything goes in a Group added to `parent` (origin = play-area centre, y 0 = ground, +z = player side; footprint about 26 x 20 units). Sky, trees, grass and lights are only built standalone, so town lighting is untouched. `api.camera` is the mirrored world-space camera; fov comes from the world camera. Taps: window `pointerdown` capture, only when the target is the world canvas. Music is off by default; sfx stay on.

### Overlay page
Mount `Playground.dc.html` with prop `world` (the walker). It does not create the game. It listens for `window` event **`8g:playground`** (detail = hud object, `null` when the game closes), reads the API from `world._playground.g()`, and BACK calls `world._playground.end()`. Root is transparent with `pointer-events: none`; panels take taps; the middle passes taps to the 3D canvas.

### Fox adapter
`makeFox(look, kit)` in playground-build.js uses `kit.makeFox({ torso, outfit, mood })` when present, else a placeholder (capsule body, head with ears and snout, arms, legs, tail) with the same `userData.P` joints. Poses are offsets from each joint's rest rotation: arms/legs rotate on x (negative = forward, -PI = straight up), z tilts sideways. `kit.animFox` is used for walking/idle on kit foxes.

## TRY THIS
- [ ] Open at 390x844: championship starts at once on SWINGS, PIP/HOPE/NOBLE on the swings beside you.
- [ ] Tap only in the yellow: the swing climbs. Double-tap in one swing: you lose height.
- [ ] Monkey bars: tap early on purpose and watch the slip.
- [ ] Merry-go-round: tap twice fast near the start; you lose grip and fly off dizzy.
- [ ] Sandbox: miss three buckets badly; the castle crumbles. Six good buckets plant a flag.
- [ ] Results card: score, best, gold, XP, stars, PLAY AGAIN, BACK.
- [ ] MENU > PASS & PLAY > 3 players; each fox gets a turn prompt.
- [ ] MENU > DEMO; captions teach, then tap PLAY NOW.
- [ ] Turn the phone to 844x390: panels slim down, camera re-frames.
- [ ] Close your eyes on SWINGS and play by the tick sound.
- [ ] World-Test: playground sits in a fake town at (20,0,-15) turned 0.9; play a full game; BACK returns to the town view; ENTER starts again.
