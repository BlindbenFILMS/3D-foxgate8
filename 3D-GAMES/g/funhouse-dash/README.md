# FUNHOUSE DASH (8 GATES 3D minigame)

A carnival funhouse obstacle run. Hold to run, let go to stop. Get through five rooms as fast as you can, then slide into the ball pit. The fastest clean run wins.

Game key: `funhouse` · Module: `minigames/funhouse/funhouse.js` · Max players: 4

## The rooms
1. **Hammer Alley**: two padded hammers swing across the track. A whoosh plays as each one passes the bottom. Go right after it.
2. **Air Jets**: four floor grates fire as a wave. They glow and hiss first, then blow. Run in right behind the puffs.
3. **Barrel of Fun**: a rolling barrel. Never stop inside it, or you tumble back out.
4. **Tippy Floor**: a see-saw plank. When the far end tips up you slide back. Cross while it tips down (you run faster downhill).
5. **Mirror Hall**: three mirror doors, one is real. The real door chimes from its side (stereo) and glints. A wrong door cracks and bonks you back.
6. **The Slide**: automatic. Golden tickets on the way add bonus points.

Getting hit = BONK: you fly back a few metres and lose time. Every run uses the same hazard timing from GO, so ghosts of earlier runs race alongside you in sync.

**Score** = 1000, minus 25 per second, plus 20 per ticket (10 tickets). A run that hits 75 s counts as DNF (tickets only).
**Stars**: 450 / 700 / 900. **Rewards** (VS CPU win): 20 gold + 10 per star, 40 XP (10 XP for a loss). Pass & play: 10 + 5 per star for the winner's score. Best score is saved.

## Controls
| | Touch | Keys |
|---|---|---|
| Run | Hold anywhere on the 3D view, or the HOLD TO RUN button | Space, Enter, W, D, Up or Right arrow |
| Pick a door | Tap the door, or DOOR 1 / 2 / 3 buttons | 1 2 3, or Left / Up / Right |
| Watch a CPU run faster | Tap the view, or FAST FORWARD | Space or F |
| Start a pass-and-play turn | Tap, or START RUN | Space |

A hint hand appears after 3 seconds without input.

## Modes
- **VS CPU** (default, starts at once): you run first, then the CPU races your ghost. Opponent: PIP (rookie, easy), HOPE (club level, medium, sunglasses and white cane, finds the real door by ear), NOBLE (master, hard, hover chair, red eyes).
- **PASS & PLAY**: 2 to 4 players take turns on one device. Each later runner races ghosts of everyone before them.
- **DEMO**: PIP and HOPE play while captions explain each room. Loops every few seconds on the results card.
- Online: INVITE FRIEND shows a "coming soon" card.

## Files
```
Main.dc.html                         the page (rename to "Funhouse Dash.dc.html" if your world expects that name)
World-Test.dc.html                   world-mode test: own town renderer + the page in overlay mode
minigames/funhouse/funhouse.js       scene, foxes, camera, input, API
minigames/funhouse/funhouse-rules.js track, hazards, physics, CPU AI, scoring (no three.js)
minigames/funhouse/funhouse-audio.js WebAudio synth effects + calliope waltz (no files)
vendor/three/three.module.js         three.js r160
```

## API
```js
import { GAME, createFunhouse } from './minigames/funhouse/funhouse.js';
/* GAME = { key: 'funhouse', name: 'FUNHOUSE DASH', maxPlayers: 4 } */
const api = await createFunhouse({ container, onState, opts });
```
`opts`: `world` ({ renderer, camera, parent }), `kit` ({ makeFox, animFox }), `save` ({ addGold, stat, setStat }), `mode` ('cpu' | 'local' | 'demo'), `difficulty` ('easy' | 'medium' | 'hard'), `music`, `sound`.

| Method | What it does |
|---|---|
| `hud()` | current state object (same as `onState`) |
| `setSafe({top,bottom,left,right})` | px the page UI covers; the camera re-fits the action into the free area |
| `start(mode)` | 'cpu' \| 'local' \| 'demo' |
| `restart()` / `playAgain()` | new game, same mode |
| `setDifficulty(d)` | 'easy' \| 'medium' \| 'hard' (restarts VS CPU) |
| `setPlayers(n)` | 2-4 for pass & play |
| `hold(bool)` | run button down / up |
| `pickDoor(i)` | 0, 1, 2 in the mirror hall |
| `go()` | start a pass-and-play turn |
| `fast()` | toggle 3x speed during a CPU run |
| `pause(bool)` | freeze while a menu is open |
| `setSound(bool)` / `setMusic(bool)` | audio switches (music is off by default in world mode) |
| `leave()` | standalone BACK: shows the "left" card |
| `key(e)` | world mode: forward keydown (and keyup if you have it; a held key auto-releases after 0.6 s without repeats) |
| `camera` | world mode: the world-space camera to glide onto; standalone: the normal camera |
| `snapCam()` | jump the camera to its goal now |
| `destroy()` | stop, remove listeners, close audio; in world mode removes only the funhouse group |

**State object** (about 10 per second, plus on every change): `phase` ('intro' | 'handoff' | 'countdown' | 'run' | 'finish' | 'results' | 'left'), `mode`, `diff`, `nPlayers`, `runner {name, css, cpu}`, `turn`, `turns`, `time`, `tickets`, `bonks`, `seg`, `msg`, `caption` (demo), `pop`, `count`, `human`, `door`, `tried`, `holding`, `cpuRun`, `ff`, `hint`, `players[]`, `best`, `sound`, `music`, `paused`, `result {title, score, best, newBest, gold, xp, stars, rows[]}`.

## World mode
- Pass `opts.world = { renderer, camera, parent }`. The funhouse (about 7 x 55 m, origin at the middle of the track, which runs from local z = +24 to z = -24, +z = the entrance and player's side) builds into a Group added to `parent`. Lights and the fairground decor go to a throw-away scene. Foxes queue on the ground at the entrance stairs; the podium is past the ball pit (local z of about -28).
- Never renders, resizes or disposes the world renderer. Reads size from `renderer.domElement.clientWidth/clientHeight` every frame.
- Taps: a capture-phase `pointerdown` on `window`, acted on only when `e.target === renderer.domElement`, then `preventDefault()` + `stopImmediatePropagation()`.
- **Overlay page**: mount `Main.dc.html` with a `world` prop. It does not create the game. It listens for `window` event **`8g:funhouse`** (detail = state object, or `null` when the game closes), gets the API from `world._funhouse.g()`, and calls `world._funhouse.end()` for BACK. The root is transparent with `pointer-events: none`; panels and buttons take taps.

## TRY THIS
- [ ] Open Main at 390x844: the run starts at once. Hold the 3D view; your fox runs. Let go; it stops.
- [ ] Hammer Alley: stand still and listen for the whoosh, then go. Get hit once to see the BONK flip.
- [ ] Air Jets: watch the grates glow and hiss before they blow.
- [ ] Barrel: let go inside it. You tumble back to its mouth.
- [ ] Tippy Floor: step on while the far end is up. You slide back.
- [ ] Mirror Hall: close your eyes and pick the door from the chime (headphones help). Try a wrong door first.
- [ ] Results card shows score, best, gold won, stars, PLAY AGAIN and BACK.
- [ ] Watch the CPU race your ghost; tap the view to fast-forward.
- [ ] MENU: switch to NOBLE, then PASS & PLAY with 3 players, then DEMO.
- [ ] Turn the phone to 844x390: the top bar folds into one line and the camera re-fits.
- [ ] World Test: play a full game inside the town, press BACK, then WALK BACK IN.
