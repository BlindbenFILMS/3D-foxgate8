# 8 GATES 3D: BASKETBALL

A full-court 2 v 2 basketball game for 8 GATES 3D: toon-shaded fox players in team jerseys, real ball physics (rim, backboard, net), a hold-and-release shot meter, steals, blocks, dunks, a 14-second shot clock and a game clock. It runs on its own as a full-screen page, or inside the 8 GATES world on a court group that is already standing in town.

Game key: `basketballCourt`. Max players: 4 (2 per team, people or AI).

## Files

```
Basketball.dc.html                   the page: UI only (on the Design canvas it is Main.dc.html)
World Test.dc.html                   world-mode proof (on the canvas: World-Test.dc.html)
minigames/basketball/basketball.js        scene, foxes, physics, camera, input, API
minigames/basketball/basketball-rules.js  pure rules + AI (no three.js)
minigames/basketball/basketball-audio.js  WebAudio synth sound + music
vendor/three/three.module.js              three.js r160
README.md
```

Plain ES modules, no build step. `basketball.js` imports `../../vendor/three/three.module.js`, the same path the world uses.

## Controls

| | Touch | Keyboard (1 player) | P1 (2 players) | P2 (2 players) |
|---|---|---|---|---|
| Move | left stick | WASD / arrows | WASD | arrows |
| Sprint | push the stick to the edge | Shift / L | Left Shift | Right Shift |
| Shoot (hold, release on the yellow band) / Jump / Block | SHOOT | Space / J | F | K or Enter |
| Pass / Steal | PASS | K | G | L or / |
| Switch to your teammate (defence) | SWITCH | Q / I | Q | O |
| Pause | MENU | P / Esc | P / Esc | |

- Close to the rim, SHOOT does a layup. Sprint at the rim and SHOOT to dunk.
- Tap a teammate on the court to pass to them.
- On offence you always control whoever has the ball on your team.
- With no keyup from the host, a second press of SHOOT releases the shot and held move keys time out after 0.6 s.

## Modes

- **VS CPU** (default): you and KIT against an AI pair. PIP + MOSS (rookie, yellow), HOPE + JUNO (club, blue, sunglasses and a white cane, plays by feel), NOBLE + VEX (master, red eyes, plays from a hover chair).
- **2 PLAYERS**: P1 + KIT against P2 + MOSS on one device (two sticks on touch, split keyboard on desktop).
- **DEMO**: four AI foxes play while captions teach the rules. Restarts by itself.
- Game length 2, 3 or 5 minutes. A tie at the buzzer goes to GOLDEN BASKET: the next score wins.

Scoring: 2 inside the arc, 3 outside. Missed shots are live rebounds. Out of bounds and shot-clock violations give the ball to the other team.

Rewards (VS CPU): gold and XP on a win (PIP 20, HOPE 40, NOBLE 80 gold, plus 2 per point of margin), a small consolation on a loss, best score, and 1 to 3 stars per opponent (win, win by 5, win by 10). Saved through `opts.save` when given (`addGold`, `stat`, `setStat`, keys prefixed `basketballCourt.`), otherwise localStorage under `basketballCourt.*`.

## Module API

```js
import { GAME, createBasketball } from './minigames/basketball/basketball.js';
GAME; /* { key: 'basketballCourt', name: 'BASKETBALL', maxPlayers: 4 } */

const api = await createBasketball({ container, onState, opts });
```

`opts` (all optional): `world` (see below), `kit` (the world's fox maker: `makeFox`, `animFox`), `save`, `mode` ('cpu' | 'local' | 'demo'), `diff` ('easy' | 'medium' | 'hard').

| Method | What it does |
|---|---|
| `hud()` | the current state object (the same object `onState` gets) |
| `setSafe({ top, bottom, left, right })` | px the page UI covers; the camera re-fits the action into the free area |
| `start(mode)` | 'cpu', 'local' or 'demo'; starts a new game at once |
| `restart()` | new game, same settings |
| `key(e)` | feed keydown and keyup events (world mode) |
| `camera` | world mode: the world-space camera to glide onto; standalone: the game camera |
| `snapCam()` | jump the camera to its goal now |
| `stick(who, x, y)` | analog move, who = 'p1' or 'p2', x right, y up, -1..1 |
| `btn(who, name, down)` | 'a' shoot/jump/block, 'b' pass/steal, 'c' sprint, 'd' switch |
| `pause(bool)` | pause or resume (clears held input) |
| `leave()` / `back()` | standalone BACK: leave the court / come back |
| `setDiff(k)` / `setLength(min)` | 'easy' / 'medium' / 'hard'; 2, 3 or 5 minutes (restarts) |
| `setSound(b)` / `setMusic(b)` / `unlockAudio()` | audio switches; music is off by default in world mode |
| `destroy()` | stops the loop, removes listeners, closes audio; in world mode removes only its group |

`onState(h)` runs about 10 times a second and at once on any change. Main fields: `phase` ('tip' | 'play' | 'inbound' | 'score' | 'dead' | 'ot' | 'over'), `mode`, `diff`, `score[2]`, `teams[2] {name,color}`, `clock`, `shotClock`, `shotLow`, `poss`, `ot`, `msg {text,sub,id}`, `caption`, `humans[] {who, team, a, b, c, d, stam, hasBall, hint {target,text}}`, `result {title, score, winner, won, stars, gold, xp, best, newBest}`, `paused`, `left`, `sound`, `music`, `best`, `stars`.

## World mode

```js
const api = await createBasketball({ onState, opts: { world: { renderer, camera, parent }, kit, save } });
```

- No renderer of its own; the world renders. Everything playable (floor and lines, hoops, nets, players, ball, shot meter) goes into `new THREE.Group()` added to `parent`. Origin = centre court, y = 0 = floor, +z = the player side, court runs along x (34 x 19 units, a fox is 2.8 tall).
- Lights, arena, crowd, fog and background are standalone only (lights go in a throw-away scene in world mode).
- `api.camera` is a world-space camera mirrored every frame from the game's local camera (fov from `world.camera.fov`, aspect from the world canvas). Glide your camera onto it.
- Pointer: one capture-phase `pointerdown` on `window`, acting only when `e.target === renderer.domElement` (then `preventDefault` + `stopImmediatePropagation`). Keys come only through `api.key(e)`; send keyup too.
- `destroy()` removes the group and listeners and closes the AudioContext; it never touches the world renderer or camera.

### The page in overlay mode

Give the page a `world` prop and it does not create the game. It listens for `window` events `8g:basketballCourt` (detail = the hud object, or `null` when the game closes), gets the API from `world._basketballCourt.g()`, and calls `world._basketballCourt.end()` for BACK and LEAVE. The root is transparent with `pointer-events: none`; only panels and buttons take taps.

The world side, in short:

```js
world._basketballCourt = { g: () => api, end: () => { api.destroy(); api = null; dispatch(null); } };
api = await createBasketball({ onState: (h) => dispatch(h), opts: { world: { renderer, camera, parent: courtGroup } } });
function dispatch(h) { window.dispatchEvent(new CustomEvent('8g:basketballCourt', { detail: h })); }
```

`World Test.dc.html` does exactly this with a small fake town (parent at (20, 0, -15), rotation.y = 0.9).

## TRY THIS

- [ ] Phone portrait 390 x 844: the camera swings behind the team with the ball; stick bottom left, SHOOT / PASS / SWITCH bottom right.
- [ ] Phone landscape 844 x 390: sideline camera, stick and buttons at the sides, caption under the scoreboard.
- [ ] Desktop: key legend at the bottom, hold Space and let go on the yellow band.
- [ ] Wait 3 seconds without touching anything: a hand points at the right control.
- [ ] Win the tip by jumping when the ball peaks.
- [ ] Hit a PERFECT three from outside the arc. Sprint in and dunk.
- [ ] On defence: STEAL near the dribbler, BLOCK as the shooter rises, SWITCH to KIT.
- [ ] Let the shot clock run out; knock the ball out of bounds.
- [ ] Beat PIP, then HOPE, then NOBLE in the hover chair. Check the stars in MENU.
- [ ] MENU: change mode, opponent, length, sound, music; read RULES; RESTART; LEAVE.
- [ ] INVITE FRIEND: shows COMING SOON and offers 2 PLAYERS.
- [ ] Tie the game at the buzzer for GOLDEN BASKET.
- [ ] World Test: play a full game inside the rotated town group, press BACK, the court leaves town cleanly, PLAY BASKETBALL brings it back.
