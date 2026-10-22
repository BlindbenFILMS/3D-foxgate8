# VOLLEYBALL: 8 GATES 3D minigame

Beach volleyball, 2 v 2, on a sand court with toon-shaded foxes. You and your AI teammate ACE play PIP, HOPE or NOBLE and their partner. It is a timing game: your fox runs to the ball on its own (AUTO-RUN), and you tap when the yellow ring closes on the ball. Four beeps count you in, so you can also play it by ear.

Game key: `volleyballCourt` · name `VOLLEYBALL` · max players 4.

## Files

```
Volleyball.dc.html                         the page (UI only). Standalone + overlay mode
World_Test.dc.html                         world-mode proof: a small town with the court at an offset
minigames/volleyball/volleyball.js         scene, flow, AI, camera, input (ES module)
minigames/volleyball/volleyball-rules.js   pure rules, ballistic maths, AI aiming (no three.js)
minigames/volleyball/volleyball-audio.js   WebAudio synth: effects, beach loop, ball sound
vendor/three/three.module.js               three.js r160 (the minified ESM build, same API)
README.md                                  this file
```

No build step. Imports are relative (`../../vendor/three/three.module.js`), so the folder drops into the world unchanged.

## How to play

| | Touch | Keys |
|---|---|---|
| Hit (smart: pass, set or spike) | tap anywhere | Space |
| Force pass / set / spike | buttons 1 2 3 | 1 2 3 (or J K L) |
| Aim a spike | tap their court as you hit | |
| Move (optional, AUTO-RUN does it) | MOVE pad | WASD / arrows |
| Serve | hold, release in the white zone; drag sideways to aim | hold Space, release |
| Block | when you are at the net, tap as their hitter swings | Space |
| Player 2 (pass & play) | tap the top half of the screen | Enter + arrows |

- Each side gets three touches. Rally scoring: every rally gives a point. First to 11 (7 or 15 in MENU), win by two.
- Ball lands in their sand: your point. Out, wide of the antenna, under or into the net: their point. The team that touched it last loses an out ball.
- Balls flying out: let them drop. ACE shouts OUT for you.
- Timing grades: PERFECT, GOOD, OK. Better grades mean faster spikes and cleaner passes. Too early or too late is a miss.
- BALL SOUND (MENU): a tone that rises as the ball comes to your fox and pans left or right with it.

## Modes and cast

- **VS CPU** (default, starts at once): you + ACE against PIP (rookie, yellow), HOPE (club, blue legs, sunglasses, white cane on her back, plays by feel) or NOBLE (master, hover chair, red eyes).
- **PASS & PLAY**: two people on one device. Player 1 is the near team, Player 2 plays the chosen captain on the far team. Each has an AI partner.
- **DEMO**: four AI foxes play while captions teach the rules. Loops.

Rewards (VS CPU wins only): gold (PIP 10, HOPE 20, NOBLE 40, +5 per extra star), XP, stars (1 win, 2 for a 4+ point margin, 3 when they score a third of the target or less), best winning margin, longest rally.

## Module API

```js
import { GAME, createVolleyball } from './minigames/volleyball/volleyball.js';
/* GAME = { key: 'volleyballCourt', name: 'VOLLEYBALL', maxPlayers: 4 } */

const api = await createVolleyball({ container, onState, opts });
```

`opts` (all optional):

| key | what |
|---|---|
| `world` | `{ renderer, camera, parent }`: WORLD MODE (below) |
| `kit` | the world fox kit: `kit.makeFox({ torso, outfit, mood })`, `kit.animFox(fox, dt, speed)` |
| `save` | `save.addGold(n)`, `save.stat(key, def)`, `save.setStat(key, v)`. Without it: localStorage `volleyballCourt.*` |
| `mode` | `'cpu'` (default), `'local'`, `'demo'` |
| `diff` | 0 PIP, 1 HOPE, 2 NOBLE (else the saved choice) |

Returned object:

| method | what |
|---|---|
| `hud()` | the current state object (same as `onState`) |
| `setSafe({ top, bottom, left, right })` | px the page UI covers; the camera re-fits the court into the free area |
| `start(mode)` | `'cpu'`, `'local'`, `'demo'` |
| `restart()`, `playAgain()` | new match in the same mode (`playAgain` leaves demo for cpu) |
| `key(e)` | key events (keydown, and keyup when you have it) |
| `camera` | getter. World mode: the WORLD-SPACE camera to glide onto. Standalone: the game camera |
| `snapCam()` | jump the camera to its goal now |
| `destroy()` | stop everything; in world mode removes only its own group |
| `press(action, who = 1)`, `release(action, who = 1)` | page buttons: `'smart'`, `'pass'`, `'set'`, `'attack'`, `'serve'` |
| `joy(x, y, who = 1)` | joystick, -1..1, y up |
| `pause(on)` | freeze play (MENU open) |
| `setOpt(key, value)` | `sound`, `music`, `ballSound`, `autoRun`, `points`, `diff` |
| `setDiff(i)`, `setPoints(n)` | shortcuts; both restart the match |
| `unlockAudio()` | resume WebAudio after a user gesture |

`onState(h)` fires about 10 times a second and at once on changes (and `null` after `destroy`). Main fields: `phase` (`serve`, `rally`, `point`, `over`), `mode`, `teams[2]` `{ name, score, color, serving }`, `target`, `matchPoint`, `serve` (`{ who, ready, charging, power, net, long }` while a human serves), `prompt` / `prompt2` (`{ who, action: 'PASS'|'SET'|'SPIKE'|'OVER'|'BLOCK'|'SERVE' }`), `msg`, `flash`, `say` (dialogue, max 20 words), `caption` (demo), `hint` (`'tap'` or `'hold'` after 3 s idle), `settings`, `result` (`{ title, score, gold, xp, stars, best, newBest, rally, bestRally }`).

## World mode

```js
const api = await createVolleyball({ onState, opts: { world: { renderer, camera: townCam, parent: courtGroup }, kit, save } });
```

- No renderer of its own, never renders. The court (sand pit, lines, net, poles, ball, foxes) goes into one Group under `parent`, in local space: origin at the centre of the court, +z the near (player) side. The sand pit is 15.4 x 25.2 units.
- Beach, sky, crowd and lights are built only in standalone mode, so town lighting is untouched.
- The camera is fitted in local space, then mirrored into world space every frame as `api.camera`. Glide your camera onto it.
- Input: `pointerdown` on `window`, capture phase, only when the target is the world canvas, then `stopImmediatePropagation()`. Keys arrive through `api.key(e)`. With keydown only, Space toggles the serve (press to start, press again to release).
- Music is off by default. Effects stay on.

**Page overlay mode.** Mount `Volleyball.dc.html` with a `world` prop. It does not create the game. It listens for `window` events `8g:volleyballCourt` (detail = the hud object, `null` when the game closes), reads the API from `world._volleyballCourt.g()`, and calls `world._volleyballCourt.end()` for BACK. The root is transparent with `pointer-events: none`; only panels and buttons take taps.

The world side, in short:

```js
world._volleyballCourt = {
  g: () => api,
  end: () => { api.destroy(); api = null; window.dispatchEvent(new CustomEvent('8g:volleyballCourt', { detail: null })); }
};
api = await createVolleyball({ onState: (h) => window.dispatchEvent(new CustomEvent('8g:volleyballCourt', { detail: h })), opts: { world: { renderer, camera, parent } } });
```

`World_Test.dc.html` does exactly this with a toy town (court group at (20, 0, -15), rotation.y 0.9) and shows a TOWN TAPS counter that must stay at 0 while you play.

## Fox adapter

`makeFox(o)` uses `opts.kit.makeFox` when present, else a placeholder fox (capsule body, head with ears and snout, arms and legs on pivots) with the same `userData.P = { body, head, arms[2], legs[2] }`. All posing goes through those joints, offset from their rest rotation. Cast extras (HOPE's glasses and cane, NOBLE's chair and red eyes, PIP's headband) are added to `P.head` / `P.body` / the root.

## Budget

Under 90 draw calls standalone (each fox is 6 merged meshes + outlines, static scenery merged by vertex colour), no shadow maps (blob shadows instead), 2 lights. Files: volleyball.js about 75 KB, rules 9 KB, audio 9 KB.

## TRY THIS

1. Open at 390 x 844: the match starts at once. Wait 3 s: the hint hand says HOLD. Hold SERVE, release in the white. The yellow ring on their court shows where it will land.
2. When the ring appears, listen for four beeps and tap on the fourth. Try for PERFECT on all three touches.
3. On your spike, tap an empty spot in their court to aim.
4. Let a ball that is flying long drop (ACE calls OUT). You get GOOD LEAVE and the point.
5. MENU: switch to NOBLE. Watch him block at the net; try blocking his spike by tapping as he swings.
6. MENU: turn on BALL SOUND, close your eyes and play a rally by ear.
7. Rotate to 844 x 390: controls move to the sides, the court re-fits.
8. MENU, DEMO: watch a full match with captions.
9. INVITE FRIEND, PASS & PLAY: Player 2 taps the top half.
10. Win a match: result card shows gold, XP, stars, best margin, longest rally. PLAY AGAIN.
11. Open `World_Test.dc.html`: the camera glides from the town onto the court. Play a full game, check TOWN TAPS stays 0, press BACK: the court disappears and the camera glides back.
