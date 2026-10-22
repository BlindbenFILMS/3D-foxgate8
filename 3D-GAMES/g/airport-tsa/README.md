# AIRPORT TSA — 8 GATES 3D minigame

You are a TSA agent at 8 GATES International. Work **Lane 1** of the security checkpoint: check IDs and read the X-ray. You can also leave your post and **patrol the terminal** for anything suspicious. A rival agent (PIP, HOPE or NOBLE) works Lane 2 and patrols the same floor. The best score at the end of the shift wins.

The terminal is a full toon interior:
- **Landside:** FOXAIR check-in with agents, queue ropes, an info desk, benches, the PAW & BREW café, baggage claim with a moving carousel, and a departures board.
- **Checkpoint:** two lanes, each with an ID podium, bin rollers, an X-ray tunnel, a live monitor, a metal-detector arch with lights, a bag-check table, and a one-way exit lane.
- **Airside:** gates A1 and A2 with seating, duty free, restrooms, vending, and a STAFF ONLY room.
- **Outside:** jets parked at jet bridges, seen through the window wall.

## Files
```
Main.dc.html                         the page (UI only), standalone + overlay mode
World-Test.dc.html                   world-mode test: a tiny town renders the game in its own renderer
minigames/airport/airport.js         game module: scene, rules flow, camera, input, API
minigames/airport/airport-rules.js   pure rules, data, scoring, AI choices (no three.js)
minigames/airport/airport-world.js   the terminal: layout, colliders, walk graph, props
minigames/airport/airport-fox.js     fox adapter (opts.kit.makeFox, else a placeholder fox)
minigames/airport/airport-kit.js     toon materials, mesh merging, sign atlas
minigames/airport/airport-xray.js    X-ray screen + departures board (2D canvas)
minigames/airport/airport-audio.js   WebAudio synth effects + lounge loop
vendor/three/three.module.js         three.js r160
```

## How to play
| Phase | What you do |
|---|---|
| Patrol | Walk anywhere. Stand near something odd and press **1 INSPECT**. Walk to the LANE 1 podium and press **1 TAKE POST**. |
| ID check | Compare the ID card and the boarding pass: names match, the photo fur matches the passenger, the ID has not expired, and the pass date is today (15 OCT 2026). **1 APPROVE** or **2 DENY**. |
| X-ray | Tap items on the monitor to tag them. Banned: knives, big scissors, big bottles, hammers, spray cans, fireworks. **1 CLEAR BAG** or **2 SEARCH BAG**. |
| Inspect | Each incident is real or harmless. Real ones: a lone bag, a propped staff door, a passenger tugging the staff door, a spill, a lost wallet, or a passenger walking in through the exit. Harmless ones: the owner sits beside the bag, a pilot swipes a badge, or a pilot walks out of the exit. **1 ACT** or **2 ALL CLEAR**. |

**Leaving your post** (button 3) lets the Lane 1 line grow. Six or more waiting costs 10 points every 6 seconds.

**RADIO** (button 3 while patrolling) shows every open incident on the minimap for 6 seconds. It then needs 18 seconds to recharge.

### Points
| Action | Points |
|---|---|
| ID: good approve | +40 |
| ID: caught a bad one | +80 |
| ID: approved a bad one | -100 |
| ID: denied a good one | -60 |
| Bag: banned item found | +100 |
| Bag: clean bag cleared | +50 |
| Bag: banned item missed | -150 |
| Bag: clean bag searched | -40 |
| Tag on a banned item | +30 each |
| Tag on a safe item | -10 each |
| Incident: real one handled | +100 |
| Incident: harmless one cleared | +50 |
| Incident: false alarm | -40 |
| Incident: real one cleared by mistake | -60 |

Stars come at 250, 600 and 1000 points (scaled to shift length). Gold is score / 25, plus 25 for a win.

### Controls
- **Touch:** drag the MOVE pad, then use buttons 1, 2 and 3 on the right. Hold 2 to sprint. Tap the X-ray monitor to tag items.
- **Keys:** WASD or the arrow keys to walk, Shift to sprint. 1, E, Space or Enter is button 1. 2 is button 2. 3 or R is button 3. Esc or M opens the menu.

### Modes
- **VS CPU** (180 s): pick your rival in MENU.
  - PIP (rookie, yellow) is slow, notices incidents late and makes about a quarter of calls wrong.
  - HOPE (club level, blue legs, sunglasses, white cane) works by feel and is steady.
  - NOBLE (master, hover chair, red eyes) is fast and rarely wrong.
- **PASS & PLAY** (120 s each, 2 to 4 agents): every agent gets the same seed, so the same airport and the same passengers.
- **DEMO** (150 s): two AI agents play while captions teach.

## Module API
```js
import { GAME, createAirport } from './minigames/airport/airport.js';
GAME = { key: 'airportTSA', name: 'AIRPORT TSA', maxPlayers: 4 }
const api = await createAirport({ container, onState, opts });
```
`opts`: `world` (see below), `kit` (fox maker), `save` (`addGold`, `stat`, `setStat`), `mode` ('cpu' | 'local' | 'demo').

| Method | Does |
|---|---|
| `hud()` | current state (the same object `onState` gets, about 10 times a second and on every change) |
| `setSafe({top,bottom,left,right})` | px the page UI covers; the camera frames the action in the free area |
| `start(mode)`, `restart()`, `setMode(m)` | new shift |
| `key(e)` | keydown / keyup events (world mode) |
| `camera` | world-space camera in world mode, else the normal camera |
| `snapCam()` | jump the camera to its goal |
| `destroy()` | stop and remove everything; in world mode only the game's own group |
| `move(x, y)`, `sprint(on)`, `button(1/2/3)` | movement and buttons |
| `act()`, `radio()`, `takePost()`, `leavePost()` | patrol actions |
| `approve()`, `deny()` | ID check |
| `clearBag()`, `searchBag()`, `tapXray(u, v)` | X-ray |
| `inspectAct()`, `inspectClear()` | incidents |
| `skip()`, `next()`, `quit()` | skip a bag result, start the next pass-and-play agent, end the shift now |
| `menu(open)` | pause and resume |
| `setLevel(0/1/2)`, `setPlayers(2-4)` | restart with that rival or that number of agents |
| `setSound(b)`, `setMusic(b)`, `unlock()` | audio; call `unlock()` from a user gesture |

`hud()` fields: `phase` (patrol | post | id | belt | xray | reveal | inspect | handoff | result), `mode`, `demo`, `timeText`, `low`, `score`, `best`, `gold`, `rival {name, score}`, `queue`, `queueWarn`, `near {kind, label}`, `sprint`, `radioReady`, `radioCd`, `id {…card…}`, `xray {ready, tags, num}`, `inspect {title, text, act}`, `reveal {title, text, good, pts}`, `toast`, `caption`, `map {p, rv, post, inc[]}`, `result`, `handoff`, `menu`, `idle`, `levels`, `players`, `sound`, `music`, `today`.

## World mode
`opts.world = { renderer, camera, parent }`:
- **Scene:** the game builds into a Group added to `parent`, in local coordinates. The origin is the hall centre, y = 0 is the floor, and +z is the entrance side.
- **Kept out of the town:** the room shell, ceiling, columns, lights, sky and the jets outside go into a throw-away scene. Floor, furniture, checkpoint, signs and every fox stay in the group.
- **Renderer:** none of its own. The game never calls `render`, `setSize` or `dispose` on the world renderer.
- **Size and camera:** size is read from the world canvas each frame. The local camera is mirrored into world space as `api.camera`.
- **Input:** taps are caught on `window` in capture mode, only on the world canvas, and stopped so the town does not react. Keys come in through `api.key(e)`.
- **Audio:** music is off by default; sound effects stay on.

**Overlay page:** when `Main.dc.html` gets a `world` prop, it does not create the game. Instead it:
- listens for `window` events `8g:airportTSA` (`detail` = the hud, or `null` when the game closes);
- reads the API from `world._airportTSA.g()`;
- calls `world._airportTSA.end()` for BACK.

Its root is transparent with `pointer-events: none`.

## TRY THIS
- [ ] Phone portrait (390x844): walk with the pad, take your post, approve one ID and deny a bad one.
- [ ] Phone landscape (844x390): the ID and X-ray panels move to the right side and the camera re-centres.
- [ ] Tag a knife or big bottle on the monitor, then SEARCH. Tag nothing on a clean bag, then CLEAR.
- [ ] Leave your post, press RADIO, walk to the yellow square on the map, and INSPECT.
- [ ] Find a bag whose owner sits beside it and choose ALL CLEAR (+50). Report a lone one (+100).
- [ ] Let the line hit 6 and watch the LINE cell turn red.
- [ ] MENU → NOBLE, then try to beat the hover chair.
- [ ] PASS AND PLAY with 3 agents: the handoff card appears between shifts and the ranking shows at the end.
- [ ] DEMO: captions explain each step.
- [ ] World Test: play a full shift in the town, press BACK, and check the parent group is empty.
