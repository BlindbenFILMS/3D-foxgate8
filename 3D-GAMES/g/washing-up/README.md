# WASHING UP (8 GATES 3D minigame)

Scrub dishes clean at a kitchen tub, racing the clock and up to three rival foxes.
Every grime spot gone sends the dish to the drying rack, and the next one slides in from the dirty pile.
Toon-shaded three.js r160, no build step, plain ES modules.

## Files

```
WashingUp.dc.html                   the page (UI only, loads the module)
WorldTest.dc.html                   world-mode test: own town scene + the page in overlay mode
minigames/dishes/dishes.js          scene, camera, input, flow (createWashingUp)
minigames/dishes/dishes-rules.js    pure rules, dish queue, AI tuning, rewards
minigames/dishes/dishes-audio.js    WebAudio synth sounds + kitchen tune
vendor/three/three.module.js        three.js r160
```

## How to play

- **Drag on the dish** to scrub with the sponge. Arrow keys or WASD move the sponge and scrub too.
- **Food** (red, orange, brown, green) comes off with a few rubs.
- **Grease** (yellow, shiny) needs soap. The SOAP bar drains as you scrub; tap **SOAP** (or Space / E) to refill.
- **Burnt** bits on pans (black) take extra scrubbing.
- **Crystal** plates are fragile. Scrub too fast and the CRACK bar fills; full = smashed, -1 point.
- Points: plate, bowl, mug 1. Pan, crystal 2. Finish a dish under par time for +1.
- Sound helps: the squeak is gritty over dirt and turns into a bright swish over clean china, and each spot that goes plays a note.

## Modes

- **VS CPU** (default): you plus 1 to 3 rivals washing at the same time. TOP RIVAL sets the level:
  PIP (rookie, yellow, daydreams, may crack crystal), HOPE (club, blue legs, sunglasses, white cane, plays by feel, never breaks crystal), NOBLE (master, hover chair, red eyes).
- **PASS & PLAY**: 2 to 4 players take turns on one device. Same dish queue for everyone, so it is fair.
- **DEMO**: HOPE vs NOBLE play 30-second rounds while captions teach the rules. Loops.

Round length 45 / 60 / 90 seconds (MENU). Win VS CPU for gold (more for harder rivals) and XP. Stars at 8 / 15 / 22 points. Best score per mode.
Saved through `opts.save` (`addGold`, `stat`, `setStat` with keys `dishSink.*`), otherwise localStorage `dishSink.*`.

Keys: arrows / WASD scrub, Space or E soap, Enter = READY / play again, R restart, P pause.

## API

```js
import { GAME, createWashingUp } from './minigames/dishes/dishes.js';
/* GAME = { key: 'dishSink', name: 'WASHING UP', maxPlayers: 4 } */
const api = await createWashingUp({ container, onState, opts });
```

`opts`: `world` ({ renderer, camera, parent }), `kit` ({ makeFox, animFox }), `save`, `mode` ('cpu' | 'local' | 'demo').

| method | what it does |
|---|---|
| `hud()` | current state object (the same thing `onState` gets, about 10 times a second and on every change) |
| `setSafe({top,bottom,left,right})` | px the page UI covers; the camera re-fits the sink into the free area |
| `start(mode)` | 'cpu' / 'local' / 'demo' (new seed, new round) |
| `key(e)` | keydown forwarded by the world; returns true when used |
| `camera` | world mode: the world-space camera to glide onto; standalone: the game camera |
| `snapCam()` | jump the camera to its goal now |
| `destroy()` | stop loop, remove listeners, close audio; world mode removes only the game group |
| `soap()` `restart()` `ready()` `pause(bool)` | buttons |
| `setMode(m)` `setDifficulty('pip'|'hope'|'noble')` `setRivals(1-3)` `setSeats(2-4)` `setRound(45|60|90)` | menu (these restart the round) |
| `setSound(bool)` `setMusic(bool)` `unlockAudio()` | audio |

`hud()` fields: `phase` ('count' | 'play' | 'pass' | 'results'), `paused`, `count`, `time`, `timeMax`, `players[]` ({name, color, score, dishes, cpu, active}), `active`, `human`, `dish` ({type, name, tip, fragile, pts}), `soap` 0-1, `needSoap`, `crack` 0-1, `msg`, `caption`, `hint` ({x, y} px or null), `diff`, `rivals`, `seats`, `round`, `sound`, `music`, `pass` ({name, color, turn, of}), `result` ({title, win, draw, score, best, newBest, gold, xp, stars, rows[]}), `rules[]`, `cast[]`.

## World mode

- No renderer of its own; the game's objects live in one Group added to `opts.world.parent` (origin = centre of the player's tub, y = 0 floor, +z = the player's side). The counter, tub, rack, foxes and dishes are the playable object; the kitchen room and lights are only built standalone.
- Rival sinks sit at x = 5.6, -5.6, 11.2 along the same counter, so leave about 17 units of room along local x.
- `api.camera` is the world-space mirror of the local camera, refreshed each frame. Fov follows `opts.world.camera.fov`.
- Pointer: window capture listener, acts only when `e.target === renderer.domElement`, then stops the event so the town does not react.
- Music is off by default in world mode, sound effects on.

### Overlay page

Mount `WashingUp.dc.html` with a `world` prop. It does not create the game; it listens for `window` events **`8g:dishSink`** (detail = the hud, or `null` when the game closes), gets the API from `world._dishSink.g()` and calls `world._dishSink.end()` for BACK. The root is transparent with `pointer-events: none`; only panels take taps.

## TRY THIS

- [ ] Phone portrait 390x844 and landscape 844x390: the tub sits in the gap between the top bar and the bottom bar.
- [ ] Wait 3 seconds without touching: the hint hand appears over the dish.
- [ ] Scrub a grease spot with an empty soap bar: it barely moves and SOAP turns red. Tap SOAP.
- [ ] Rub a CRYSTAL plate hard and fast: GENTLE warning, cracks appear, then it smashes (-1).
- [ ] Finish a plate quickly for the +1 FAST bonus.
- [ ] MENU: switch TOP RIVAL to NOBLE with 3 rivals. Can you still win?
- [ ] PASS & PLAY with 3 players: the camera glides to each sink, READY card between turns.
- [ ] DEMO: two CPU foxes play while captions teach. It loops.
- [ ] Turn SOUND off and on, MUSIC off and on.
- [ ] World Test: play a full round in town, press BACK: the game group disappears and the town camera glides home. WALK UP TO THE SINK reopens it.
