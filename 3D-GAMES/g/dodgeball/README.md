# DODGEBALL (8 GATES 3D minigame)

Two teams of two foxes on a toon-shaded court. Hit a fox on the full and it is out. Catch a throw and the thrower is out, and one of your benched teammates comes back. Clear the other team to win a round. First to two rounds wins the match.

Game key: `dodgeballCourt` · name `DODGEBALL` · max players 4.

## Files

```
Dodgeball.dc.html                         the page (UI only), loads the module
World-Test.dc.html                        world-mode test: a tiny town, the court at (20,0,-15) turned 0.9, page in overlay mode
minigames/dodgeball/dodgeball.js          scene, rules loop, AI, camera, input (ES module)
minigames/dodgeball/dodgeball-rules.js    pure rules, numbers, AI choices, rewards (no three.js)
minigames/dodgeball/dodgeball-audio.js    WebAudio synth sound + music loop (no files)
vendor/three/three.module.js              three.js r160 (MIT, see LICENSE.txt)
```

No build step. Imports are relative: `../../vendor/three/three.module.js`.

## Controls

Touch (one thumb each side):
- **MOVE** pad (left): drag to run. Run onto a ball to pick it up. Tap the floor to run there.
- **THROW** (right, big): hold, then let go. The bar sweeps up and down; let go in the **yellow band** for a PERFECT throw (fastest and straight).
- **CATCH**: tap as the ball arrives. It turns yellow and says **NOW** at the right moment, and a short tick rises in pitch as a ball comes at you. While you hold a ball it becomes **BLOCK**.
- **DODGE**: a quick sideways dash; you cannot be hit during it.
- **SWAP AIM**, or tap a fox on the other team, picks your target (a yellow arrow floats over it).

Keyboard (VS CPU / DEMO): WASD or arrows move · Space or J hold to throw · K catch/block · L or Shift dodge · Q or Tab swap aim · Esc menu.
Keyboard (2 PLAYERS): P1 WASD, F throw, G catch, H dodge, R aim · P2 arrows, Enter throw, / catch, . dodge, comma aim.

## Modes

- **VS CPU**: you plus RUFUS (AI teammate) against the cast. PIP (rookie, yellow), HOPE (club: blue legs, sunglasses, white cane, plays by feel and catches well), NOBLE (master: hover chair, red eyes, perfect throws).
- **2 PLAYERS** (pass & play on one device): P1 at the bottom, P2 gets a second set of controls upside down at the top. Each has an AI teammate.
- **DEMO**: four AI foxes play while captions teach the rules. Loops forever.

The game starts at once (VS CPU against PIP). Mode, opponent, sound, music and restart live under **MENU**. **INVITE FRIEND** shows a coming-soon card that offers 2 PLAYERS. **BACK** leaves.

Rewards (VS CPU): score = outs ×100 + catches ×150 + perfect throws ×50 + rounds ×250 + flawless rounds ×300 + a win bonus. Gold on a win (20 / 40 / 75 by opponent, +5 per star), XP every match, 3 stars for a 2–0 win. Saved through `opts.save` (`addGold`, `stat`, `setStat`) or localStorage under `dodgeballCourt.*` (`best`, `gold`, `xp`, `level`, `beat0..2`, `sound`, `music`).

## Module API

```js
import { GAME, createDodgeball } from './minigames/dodgeball/dodgeball.js';
const api = await createDodgeball({ container, onState: (h) => {}, opts: {
  mode: 'cpu' | 'local' | 'demo',   /* default 'cpu' */
  level: 0 | 1 | 2,                 /* PIP / HOPE / NOBLE */
  world: { renderer, camera, parent },   /* WORLD MODE */
  kit,                              /* world fox maker: makeFox / animFox */
  save,                             /* addGold(n), stat(key, def), setStat(key, v) */
  music: true,                      /* standalone only; always off in world mode */
}});
```

| method | what it does |
|---|---|
| `hud()` | current state object (the same thing `onState` gets) |
| `setSafe({top,bottom,left,right})` | px the page UI covers; the camera re-fits the court into the free area |
| `start(mode, level?)` | new match: `'cpu'`, `'local'`, `'demo'` |
| `restart()` / `playAgain()` | new match, same mode |
| `setLevel(0..2)` | change opponent (starts a new VS CPU match) |
| `joy(player, x, y)` | stick, screen frame, -1..1, y up |
| `throwDown(player)` / `throwUp(player)` | hold and release THROW |
| `catchBall(player)` | catch window (block if holding) |
| `dodge(player)` | dash |
| `cycleTarget(player)` | swap aim |
| `pause(on)` / `resume()` | freeze the match (the page pauses while MENU is open) |
| `setSound(on)` / `setMusic(on)` | |
| `key(e)` | world forwards keyboard events here (keydown, and keyup if it has them) |
| `camera` | world mode: world-space camera to glide onto; else the game camera |
| `snapCam()` | jump the camera to its goal |
| `destroy()` | stop; in world mode removes only its own group |

`player` is 0 (bottom / P1) or 1 (top / P2).

### HUD object (`onState`, about 10 times a second, 30 while charging)

`phase` (`countdown` `play` `roundEnd` `result`), `paused`, `mode`, `level`, `levelName`, `round`, `roundsToWin`, `score [home, away]`, `timer` (s), `countdown`, `teams[2] {name, color, foxes[{name, alive, holding, human}]}`, `p[2] {active, name, holding, charging, power 0..1, perfect, catchReady, dashReady, blockMode, threat 0..1, now, target}`, `msg`, `tip` (demo caption), `hint` (3 s without input), `result {win, title, sub, score, best, newBest, gold, xp, stars, lines}`, `rules[]`, `sound`, `music`, `touch`, `world`, `menuReq` (goes up when Esc is pressed), `best`, `meter {lo, hi}`, `levels[]`.

## World mode

When `opts.world` is set the module makes no renderer and never renders. The court, lines, pads, benches, foxes and balls go into one Group added to `world.parent` (origin = centre of the court, y = 0 the floor, +z the player's side). Lights, gym walls, bleachers and crowd go into a throw-away scene so the town's lighting stays untouched. The game keeps its own local camera (fov from the world camera) and mirrors it into world space every frame as `api.camera`. Taps are read from `pointerdown` on `window` in capture mode, only when the target is the world's canvas. Keys only come in through `api.key(e)`. If the world forwards keydown but never keyup, held keys fall back to key-repeat timing and THROW becomes press to wind up, press again to release. Music is off; sound effects stay on. `destroy()` removes the group and listeners and closes the AudioContext.

The page in **overlay mode**: give it the prop `world` (the walker). It does not create the game. It listens for `window` events `8g:dodgeballCourt` (detail = HUD, or `null` when the game closes), gets the API from `world._dodgeballCourt.g()`, and calls `world._dodgeballCourt.end()` for BACK. Its root is transparent with `pointer-events: none`; only panels and buttons catch taps.

## TRY THIS

1. Open `Dodgeball.dc.html` at 390×844. The match starts on its own: countdown, whistle, rush the centre.
2. Run onto a ball, hold THROW, let go in the yellow band. "PERFECT THROW" and a yellow streak.
3. Wait for PIP to throw. When CATCH turns yellow and says NOW, tap it. PIP is out.
4. Get hit once, then catch a ball: your benched fox runs back in.
5. Hold a ball and tap BLOCK as a throw comes in.
6. Leave the screen alone for 3 seconds: the hint hand appears.
7. MENU › NOBLE. Expect fast perfect throws; DODGE them.
8. Win a match: result card with score, best, gold, stars, PLAY AGAIN, BACK.
9. MENU › 2 PLAYERS on a phone: the second pad appears upside down at the top.
10. MENU › DEMO: watch the AI play with captions.
11. Turn the phone to 844×390: controls move to the corners and the court re-fits.
12. Open `World-Test.dc.html`: the town camera glides onto the court; play a full match; BACK returns to the orbiting town.
