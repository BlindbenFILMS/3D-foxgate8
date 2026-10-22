# ORCHARD — an 8 GATES 3D minigame

Foxes race to pick ripe fruit from three trees. Ripe fruit scores. Green fruit barely scores. Shake a trunk and catch what falls. Up to 4 foxes: you plus up to 3 AI rivals, or 2 to 4 people taking turns on one device.

Plain ES modules, no build step, three.js r160 only.

```
Orchard.dc.html                       the page (UI only, loads the module)
WorldTest.dc.html                     world-mode test: toy town + overlay page
minigames/orchard/orchard.js          scene, camera, input, look, API
minigames/orchard/orchard-rules.js    pure rules + AI (no three.js)
minigames/orchard/orchard-audio.js    WebAudio synth sound + music
vendor/three/three.module.js          three.js r160 (minified ESM build)
```

The page files are named without spaces (`Orchard.dc.html`, `WorldTest.dc.html`) because the canvas does not allow spaces in paths.

## How to play

- **Tap a fruit.** Your fox runs over and picks it. High fruit needs a jump, which takes a little longer.
- **Full colour means ripe:** 10 points (plum 12, peach 11). Ripe picks in a row add a streak bonus (+2 per pick after the first, up to +10).
- **Green (unripe):** 2 points, and the streak resets. **Brown (overripe):** 40% of the value. Overripe fruit falls by itself.
- **Shake:** tap a trunk or press SHAKE. Every ripe or overripe fruit on that tree falls. Stand under it to **catch for +3**. Each tree then needs 5 seconds of rest.
- **Ground fruit** is bruised: half value. It rots after about 4.5 seconds.
- **Golden apple:** 30 points, ripe for only about 3 seconds.
- **Play by ear:** every fruit that ripens chimes, panned left or right to its tree. This is how HOPE plays.

Round: 60 s vs CPU, 40 s per turn in pass and play, 45 s in demo.

### Controls
| Input | Action |
|---|---|
| Tap fruit | walk + pick (falling fruit: run to where it will land) |
| Tap trunk / SHAKE button | shake that tree (the button shakes the nearest one) |
| Tap ground | walk there |
| Arrows / WASD | walk |
| Space | pick the best fruit in reach, or shake if none |
| E | shake nearest tree |
| Enter | READY (pass and play) / PLAY AGAIN |

## Modes
- **VS CPU** (default): you against 1 to 3 rivals. The level picks the lead rival: **PIP** (rookie: yellow, slow, picks green fruit by mistake), **HOPE** (club: blue legs, sunglasses, white cane, plays by feel and walks to fruit just before it ripens), **NOBLE** (master: futuristic hover chair, red eyes, fast, contests your targets). Extra rivals are filled from the other two.
- **PASS & PLAY**: 2 to 4 players. Each gets a 40 s turn on the same seeded orchard. A READY card between turns.
- **DEMO**: two AI foxes play while captions teach the rules. It loops.
- **Online**: not built yet. INVITE FRIEND shows a "coming soon" card that offers pass and play.

## Rewards
- VS CPU win: gold = (10 + score/20) x level (PIP 1, HOPE 1.5, NOBLE 2). XP = 20 + score/10. No gold or XP on a loss.
- Pass and play: the winner earns 5 + score/40 gold.
- Best score and 0 to 3 stars (120 / 240 / 380 points; x0.7 in pass and play).
- Saved through `opts.save` when given (`addGold`, `stat`, `setStat`, keys `fruitOrchard.best`, `fruitOrchard.xp`). Otherwise saved to localStorage under `fruitOrchard.*`.

## The module API

```js
import { GAME, createOrchard } from './minigames/orchard/orchard.js';
/* GAME = { key: 'fruitOrchard', name: 'ORCHARD', maxPlayers: 4 } */
const api = await createOrchard({ container, onState: (h) => {}, opts: {} });
```

`opts`: `world` (see below), `kit` (fox maker), `save`, `mode` ('cpu' | 'local' | 'demo'), `level` ('pip' | 'hope' | 'noble'), `rivals` (1 to 3), `players` (2 to 4, pass and play), `sound`, `music`.

| Method | What it does |
|---|---|
| `hud()` | current state object (the same thing `onState` sends) |
| `setSafe({top,bottom,left,right})` | px the page UI covers. The camera re-fits so the orchard sits in the free area |
| `start(mode)` | 'cpu', 'local' or 'demo'. A new seed, a new match |
| `restart()` | the same mode again |
| `ready()` | pass and play: start the next player's turn |
| `key(e)` | keydown handler. The world forwards keys here |
| `camera` | world mode: the world-space camera. Otherwise the game camera |
| `snapCam()` | jump the camera to its goal now |
| `pause(bool)` | freeze the simulation (the page pauses while MENU is open) |
| `setLevel(l)` `setRivals(n)` `setPlayers(n)` | apply on the next `start` |
| `setSound(b)` `setMusic(b)` | toggles |
| `shake()` | your fox shakes the nearest tree |
| `tap(x, y)` | the same as a tap at canvas px (x, y) |
| `unlockAudio()` | start the AudioContext after a user gesture |
| `destroy()` | stop everything. In world mode it removes only its own group |

### The hud object
```js
{
  key, phase,             /* 'count' | 'play' | 'pass' | 'result' | 'demoEnd' */
  mode, level, levelName, levelRank, rivals, nLocal, paused,
  time, timeLow, count,   /* count = 3,2,1 during the countdown, else null */
  turn,                   /* pass and play: { idx, of, name, color } */
  scores: [{ name, color, score, streak, you, ai, active }],
  you: { score, streak, picks } | null,
  msg, caption,           /* short toast; demo caption */
  pass: { next, color, prev, prevScore } | null,
  result: { title, win, score, best, newBest, gold, xp, stars, rows:[{name,score,color,you}], mode, streak, picks } | null,
  hint: { x, y } | null,  /* canvas px of a ripe fruit after 3 s of no input */
  shakeReady, sound, music, best
}
```

## World mode
Pass `opts.world = { renderer, camera, parent }`:
- No renderer of its own. It never calls `render`, `setSize` or `dispose` on the world's renderer.
- Trees, fruit, foxes and the fenced grass plot go into one `THREE.Group` added to `parent`. Origin is the centre of the plot, y = 0 is the ground, +z is the player's side. The plot is about 19.4 x 9 units, from z = -3.6 to z = 5.4.
- Lights, hills, barn, clouds and sky go into a throw-away `THREE.Scene` that is never rendered, so the town lighting stays as it is.
- The local camera uses `world.camera.fov`. It is mirrored into world space every frame and exposed as `api.camera` for the world to glide onto.
- Input: `pointerdown` on `window` in capture mode. It acts only when the target is the world canvas, then calls `preventDefault` and `stopImmediatePropagation`. Keys come through `api.key(e)`.
- Music is off by default. Sound effects stay on.

### Page overlay mode and the event
Mount `Orchard.dc.html` with a `world` prop (the world's walker object). The page then does not create the game. It:
- listens for `window` events **`8g:fruitOrchard`** (`detail` = the hud object, or `null` when the game closes),
- gets the API from `world._fruitOrchard.g()`,
- calls `world._fruitOrchard.end()` for BACK.

Its root is transparent with `pointer-events: none`. Panels and buttons take taps, and the empty middle passes taps through to the 3D canvas. Blocks marked `data-safe` are measured and sent to `api.setSafe`.

Standalone, the page also accepts `save`, `kit`, `onBack` (called by BACK) and `moduleUrl` (overrides where the module is loaded from).

## Fox adapter
`makeFox(opts)` inside `orchard.js` uses `opts.kit.makeFox({ torso, outfit, mood })` when the world passes a kit, and `kit.animFox(fox, dt, speed)` for walking. Otherwise it builds a placeholder fox with the same joints (`userData.P` = body, head, arms[2], legs[2]). Basket, sunglasses, cane, hover chair and red eyes are added on top in both cases. Reach, jump, stoop, shake and cheer poses only rotate `P.arms`, `P.body` and the lift group.

## Phone budget
- No shadow maps (blob shadows), 3 lights, merged static meshes.
- Measured with 4 foxes: 148 draw calls on a touch device, 179 on desktop (desktop adds outlines to fruit and tails).
- Portrait uses closer, slimmer trees and a wider lens so the orchard fills the width.

## TRY THIS
- [ ] Open `Orchard.dc.html` at 390x844 and 844x390. The orchard sits between the top score bar and the bottom buttons.
- [ ] Wait 3 seconds without touching. A hint hand points at a ripe fruit.
- [ ] Pick 3 ripe fruits in a row. You see STREAK x3, and the pick sound rises in pitch.
- [ ] Tap a green fruit. You get "TOO GREEN" and 2 points.
- [ ] Tap a loaded trunk, then tap a falling fruit to run under it: NICE CATCH +3.
- [ ] MENU > NOBLE, 3 rival foxes > START NEW GAME. Four foxes; NOBLE floats in the chair.
- [ ] MENU > PASS & PLAY > 3 > START NEW GAME. A READY card appears between turns, then a results card ranks everyone.
- [ ] MENU > DEMO. Captions cycle and the round loops.
- [ ] Turn on headphones: ripe chimes come from the left, middle or right tree.
- [ ] Open `WorldTest.dc.html` and press ENTER ORCHARD. The camera glides onto the plot in the toy town, and taps on the canvas play the game. BACK returns to town and removes the orchard group.
