# ELECTRICIAN JOB (8 GATES 3D minigame)

You're the electrician fox in a hard hat. A cutaway house floor sits on the work table, and its wiring is scrambled. Turn the wire tiles until power runs from the **breaker panel** at the back to **every fixture** (lamps, fans, TVs, fridges, toasters), with **no loose live wires**. Race PIP, HOPE or NOBLE, who work their own copies of the same house on monitors beside the table.

- Game key: `electricianJob`
- Factory: `createElectricianJob` (also the default export)
- `GAME = { key: 'electricianJob', name: 'ELECTRICIAN JOB', maxPlayers: 4 }`

## Files

```
ElectricianJob.dc.html                         page (Design Component): UI only, loads the module
WorldTest.dc.html                              world-mode test: a toy town plus the page in overlay mode
minigames/electrician/electrician.js           scene, foxes, camera, input, modes, world mode
minigames/electrician/electrician-rules.js     pure rules + AI (no three.js): generator, power flow, solver
minigames/electrician/electrician-audio.js     WebAudio synth effects + funk loop (no audio files)
vendor/three/three.module.js                   three.js r160 (vendored)
```

The brief names the page `<Game Name>.dc.html`. File names here have no spaces (`ElectricianJob.dc.html`, `WorldTest.dc.html`) so `<dc-import name="ElectricianJob">` works. If you rename the page, update the `dc-import` in WorldTest.

## How to play

- **Tap** a tile to turn its wires a quarter turn clockwise.
- **Hold** a tile (0.4 s) to **lock** it. A yellow tag appears and the wires go blue-grey. Locked tiles won't turn, so you can't knock a finished wire out by accident. Hold again to unlock.
- **Yellow wires are live**, grey wires are dead. A fixture lights up when power reaches it.
- **Sparks** mean a live wire ends in nothing (a loose end). You need zero loose ends to finish.
- The job is done when every tile is powered and there are no loose ends. Then the whole house glows and your fox celebrates.
- After 3 seconds with no input, a hint ring and pointer show a tile to work on next. The **HINT** button shows one straight away.
- Keyboard (desktop, or forwarded through `api.key`): arrows/WASD move a cursor, Space/Enter turns, `L` locks, `H` gives a hint.

## Modes

| Mode | How it works |
|---|---|
| **VS CPU** (default) | Race 1 to 3 CPU electricians on the same house. Level sets the board size and the main rival: EASY 4x4 vs PIP, MEDIUM 5x5 vs HOPE, HARD 6x6 vs NOBLE. With extra rivals the rest of the cast joins, each at their own speed. Finish first to win. 2nd of 3 or 4 still pays a little gold. |
| **PASS & PLAY** | 2 to 4 players take turns on the exact same scrambled house. A "PASS TO PLAYER 2" card appears between turns. Fastest time wins, with fewer turns breaking ties. |
| **DEMO** | HOPE wires the main board while PIP races on the monitor, and captions teach the rules. Tap the board or PLAY to start a real game. It loops by itself. |

Cast: **PIP** (rookie, yellow, slow, makes slips) · **HOPE** (club level, blue legs, sunglasses, white cane, steady) · **NOBLE** (master, floating futuristic chair, red eyes, fast and nearly flawless).

Online play is not built yet. INVITE FRIEND shows a "coming soon" card that points to PASS & PLAY.

## Scoring and rewards

- Par time = `size² × 2.4` s. Score = `size² × 40 + (par − time) × 15 − extra turns × 5` (minimum 50).
- Stars: 3 = under par and within 25% of the fewest possible turns; 2 = within 1.6× par; 1 = finished.
- Gold on a win: 15 / 30 / 50 by level, +5 per star. XP = gold × 2. Second place (in a 3 or 4 fox race) gets a third of the gold.
- Saved through `opts.save` when given (`addGold`, `stat`, `setStat`), otherwise in localStorage under `electricianJob.*`: `best.<level>`, `gold`, `xp`, `wins`, `level`, `opponents`, `sound`, `music`.

## Module API

```js
import { createElectricianJob, GAME } from './minigames/electrician/electrician.js';

const api = await createElectricianJob({
  container,                 // standalone: element to put the canvas in
  onState: h => {},          // HUD object, ~10x per second and on every change
  opts: {
    world,                   // { renderer, camera, parent } → WORLD MODE
    kit,                     // { makeFox, animFox } from the world (optional)
    save                     // { addGold, stat, setStat } (optional)
  }
});
```

| Method | What it does |
|---|---|
| `hud()` | Current HUD object (same thing `onState` sends) |
| `setSafe({top,bottom,left,right})` | Pixels the page UI covers; the camera refits the action into the free area |
| `start(mode)` | `'cpu'` / `'local'` / `'demo'` — starts at once, no option card |
| `key(e)` | Keyboard input (the world forwards keydown here in world mode) |
| `camera` (getter) | World mode: the world-space camera to glide onto; standalone: the normal camera |
| `snapCam()` | Jump the camera to its goal now |
| `destroy()` | Stop everything. World mode removes only our group |
| `restart()` / `playAgain()` | New house, same mode |
| `nextTurn()` | PASS & PLAY: next player is ready |
| `setLevel(0-2)` | EASY / MEDIUM / HARD (restarts) |
| `setOpponents(1-3)` | Number of CPU rivals (restarts in VS CPU) |
| `setLocalPlayers(2-4)` | Pass-and-play player count (restarts in PASS & PLAY) |
| `hint()` | Show the hint ring and pointer now |
| `tap(i)` / `lock(i)` | Turn or lock tile `i` (row × size + col) |
| `pause(bool)` | Freeze the timer and AI (the page pauses while MENU or INVITE is open) |
| `toggleSound()` / `toggleMusic()` | Sound effects / music |
| `autoSolve()` | Test hook: wires your board correctly |

### HUD object (main fields)

```
key, phase ('ready'|'play'|'pass'|'done'), mode, paused,
level, levelName, levels[], opponent, opponents, localPlayers,
size, time, timeText, par, moves, minMoves, lit, fixtures, loose, locked,
players[{ name, color, pct, done, time, you }],
turn, turnName, pass{ next, done, time } | null,
banner, caption, hint{ x, y } | null,
result{ win, title, sub, score, best, gold, xp, stars, newBest, time, moves, minMoves, level, lines[] } | null,
sound, music, world, best, gold
```

## World mode

Pass `opts.world = { renderer, camera, parent }`:
- The module draws nothing itself. It builds the work table, plates, wires, fixtures, breaker panel, rival monitors and foxes into a `Group` added to `parent` (origin = centre of the table, y = 0 = ground, +z = the player's side, row 0 and the panel at −z).
- Lights and the standalone room go into a throw-away `THREE.Scene`, so town lighting is untouched.
- `api.camera` is our local camera mirrored into world space each frame. The world glides its camera onto it.
- Input: `pointerdown` on `window` in capture mode, only when `e.target === renderer.domElement`, then `preventDefault()` + `stopImmediatePropagation()`. Keys come only through `api.key(e)`.
- Music is off by default; sound effects stay on.
- `destroy()` cancels the frame loop, removes listeners, removes our group from `parent` and closes the AudioContext. It never touches the world renderer.
- Rival monitors move with the screen shape: behind the table in portrait, beside it in landscape.

### Overlay page

Mount `ElectricianJob.dc.html` with a `world` prop (the walker object). In that mode the page does **not** create the game:
- it listens for `window` events **`8g:electricianJob`** (`detail` = HUD object, or `null` when the game closes),
- gets the API from `world._electricianJob.g()`,
- calls `world._electricianJob.end()` for BACK / LEAVE,
- has a transparent root with `pointer-events: none`, so the empty middle passes taps to the 3D canvas.

Every UI block that covers the screen is marked `data-safe="top|bottom|left|right"`. The page measures them and calls `api.setSafe(...)`. In landscape the stats move into a left column (`data-safe="left"`) so the board keeps its height.

In standalone, BACK fires a `8g:electricianJob:leave` window event and drops back to the DEMO.

## TRY THIS

1. Open `ElectricianJob.dc.html` at 390x844. Play starts at once against PIP. Tap a tile next to the panel and watch the wire turn yellow.
2. Wait 3 s without touching. A yellow ring and pointer appear on a tile worth turning.
3. Hold a tile for half a second. It locks (yellow tag); tapping it now does nothing. Hold again to unlock.
4. Turn a live wire so it points off the board. Sparks appear and the caption warns about loose wires.
5. Finish the house. Everything glows, the fox jumps, and the result card shows stars, score, best and gold.
6. MENU → HARD. 6x6 vs NOBLE in a hover chair. Try to beat him.
7. MENU → CPU ELECTRICIANS → 3 RIVALS. Three monitors with PIP, HOPE and NOBLE racing.
8. MENU → PASS & PLAY → 3 PLAYERS. Each player gets the same house, with a pass card between turns.
9. MENU → DEMO. HOPE plays while captions teach. Tap the board to jump into a real game.
10. Rotate to 844x390. The stats move to a left column and the board refits.
11. Open `WorldTest.dc.html`. The town camera glides onto the job board at (20, 0, −15), rotated 0.9. Play a full game, press BACK (the game closes and the camera eases back to the town), then OPEN ELECTRICIAN JOB again.
12. Desktop: arrows, Space, L, H.
