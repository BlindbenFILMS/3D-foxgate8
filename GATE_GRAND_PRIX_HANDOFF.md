# GATE GRAND PRIX · HAND-OFF (from the Fox Fighters thread, 15 Nov 2026)

Paste this whole file into the new thread first, then upload this zip. **Fox Fighters keeps its own thread.** This is a new, separate game that borrows the Fox Fighters cast.

## WHAT BEN WANTS
A **kart racer**: a fan tribute to the classic party kart racer, starring every Fox Fighters character (23 of them), each in their own ride.
- Working name: **GATE GRAND PRIX** (or MERU KART). Ben may rename it.
- **It is a tribute, not a copy.** Use no Nintendo names, logos, characters, music, sounds, item designs or menu art. Every kart, item, track and sound is our own 8 GATES material.

## BEN'S RULES (keep them)
- **Mobile first.** Test every screen at 390 × 844 and 844 × 390. Buttons are 44 px or bigger. Phone controls (steer, drift, item) must not cover the road.
- Modernist design system: red on white / ink, square corners, flush-left labels, inline styles (no CSS classes).
- Back up a file before you change it (`backup/*.pre-sNNN.*`). Add an entry to BUILD_PLAN.md every session.
- Lore is canon only when Ben says so. The robots (Iron Warden, Maker Prime, SUDS-9) are the **hacked Machine Fleet: victims, not villains**.
- **Do not edit the shared kit files in place** (engine/*-kit.js, species-armor.js, armor-sets.js, armor-crests.js, species-leaders.js, cast.js, fox-kit.js, fox-kit-moon.js). They are shared with the main 8 GATES project. If one must change, list it in `KIT_CHANGES.md`.
- **Accessibility matters to Ben** (Blind Canvas Project). Plan an AUDIO GUIDE from the start:
  - spoken position, lap and item
  - stereo beeps that warn of the next turn (left / right, sharper turn = higher pitch)
  - a sound when a rival is close behind
  - an assisted "steer by sound" mode
  Fox Fighters already has a spoken audio guide to learn from.
- **The main 8 GATES project already has vehicle code** (vehicle-lab.js, Speedboat Bay, Skate Park, Tank Range on Ben's PC). Ask Ben to bring vehicle-lab.js over before writing kart physics from scratch.

## THE GAME (first design, for Ben's OK)
**Racing**
- 8 racers per race, 3 laps. 50 / 100 / 150 speed classes.
- **Drift boost:** hold DRIFT through a corner. The sparks go blue, then orange, then gold; release for a short, medium or long boost.
- Boost pads, ramps with a TRICK button for a small boost on landing, and off-road that slows you.
- Rubber banding: computer racers and the item odds help whoever is behind, gently.

**Items** (our own, from Fox Fighters moves; one item box each):

| Item | What it does |
|---|---|
| FOX BEAM | fires straight ahead |
| SHOEMERANG | flies forward and comes back, hitting twice |
| HONEY TRAP | dropped behind, slows whoever drives through |
| LAVA LOB | arcs onto the racer in front |
| STING SWARM | homes in on the leader |
| CRATE | dropped behind as a block |
| GATE WARP | a short teleport forward |
| SUNSTONE | 5 s of invincibility and speed |
| FOX POP | a jump over anything |

**Special boost.** Each racer has a once-per-race special, made from their Fox Fighters super (see the table). A gauge fills as you drive well (drifts, overtakes, near misses).

**Modes**
- GRAND PRIX: cups of 4 tracks, points per race, trophies.
- TIME TRIAL: with a ghost of your best lap.
- VS RACE.
- Later: BATTLE (pop the other karts' balloons in an arena).

**Players**
- **Phone: 1 player against 7 CPUs.**
- Computer: split screen for 2 to 4 players with game controllers (Gamepad API).
- Online racing comes last (Fox Fighters' online code links 2 phones: engine/duel-net.js + vendor/trystero-nostr.js).

**Tracks** (8 GATES places, never copied track layouts):

| Cup | Tracks |
|---|---|
| PEARL CUP | Pearl Sail Rooftops (helipad, gondola rails), Meru City Streets, Luxor Ring Circuit (fox crowd), Kyoto Bamboo Run |
| FURNACE CUP | Lava Cave (lava rises), Crystal Caves (glowing shortcuts), The Factory (conveyor belts, pistons), Castle Moat |
| MOON CUP | SHASTA (bear forests), LUXOR (alien desert), UR (giant leaves), GAYA (cliff gliding) |
| STAR CUP | ZION (gorilla roundhouse), NEBO (honey hive), KUFA (dust canyons), JIDDA (swamp + sandstone) |

## BUILD ORDER (one step per message, show Ben each step)
1. **Prototype:** Pearl Sail Rooftops track, Ben's kart, 1 player against 3 CPUs. Steering, drift boost, laps, finish order. Phone-test it.
2. The 23 racers in their karts (seated driving pose) and a select screen with two pages (FOXES & BOSSES / MOON PEOPLES), as in Fox Fighters.
3. Item boxes + the items, the special boost, 8 racers.
4. The PEARL CUP (4 tracks) + Grand Prix scoring + trophies.
5. Time trial + ghosts, the audio guide pass.
6. Split screen for 4 on a computer with game controllers.
7. The other cups, battle mode, online racing.

## HOW THE CHARACTERS ARE BUILT (reuse, don't rebuild)
The 23 bodies come from **`minigames/kyoto/duel-foxes.js`** in the Fox Fighters source.
- `foxFighter()` builds the foxes, with a foxKit from fox-kit.js. Ben, Hope and Noble come from engine/cast.js; the bosses use `def.boss` with engine/bosses.js.
- `rigFighter()` builds:
  - the robots (rig warden / prime / suds)
  - Slagback and the Crystal Warden (rig slag / crystal, made with engine/creature-kit.js)
  - **the 8 moon leaders** (rig `leader`, `def.leader = id`, `def.sc` = scale). These use **`minigames/kyoto/duel-moon.js`**, which runs the main project's newer rig `fox-kit-moon.js` + engine/species-leaders.js + the species kits and armour. **Call `initMoon(stage)` once first.**
- Every fighter has `upd(P, dt, f)`, which poses it from a pose object (hands / feet / hip / lean / twist / head yaw). **A seated driving pose is one new pose:** hips low, knees up, both hands forward on a wheel. Use the hands' targets to steer and lean into turns. Noble already sits in his chair.
- For a lighter build, the Fighter Workshop has every character as a .gltf model (main + 2 colours) in its fight stance.
- Each character's weapon and shot (`LEADER_GEAR` in duel-moon.js; the swords, axes and drill in duel-foxes.js) can decorate their kart, and their shot colours (`LASER_COL` in sword-duel.js) can colour their boost flames.
- Specials and supers per character are in sword-duel.js (`SIG`, `SUPER`). **characters.json** in this zip has everything in one place.

## THE RACERS · 23
Kart stats are SPEED / ACCELERATION / HANDLING / WEIGHT (1–5), a first guess from each fighter's Fox Fighters style: the heavies are fast but slow to start; the light flyers turn and accelerate best. Every ride and special is a draft for Ben's OK.

| Racer | Ride | Spd/Acc/Hnd/Wt | Special boost (once per race) |
|---|---|---|---|
| **BEN** | FOX RACER: a sleek white kart with the 8 crest and blue trim, his sword strapped to the back | 3/3/3/3 | FOX BEAM MAX: a beam blast clears the road ahead, then a boost |
| **HOPE** | CANE RUNNER: a light, quick kart; her cane is the gear stick | 3/4/4/2 | STARDUST VAULT: vaults the kart over the next corner |
| **NOBLE** | THUNDER CHAIR: his own electric wheelchair, souped up with spiked wheels and sparks | 4/3/3/3 | THUNDER CHAIR: an electric surge, shocking anyone close |
| **KING MIGHT** | ROYAL CARRIAGE: a gold and purple throne kart | 4/2/2/4 | ROYAL DECREE: a purple shockwave pushes karts aside |
| **MICHELLE** | PETAL CRUISER: a blue princess kart with a petal trail | 2/5/4/2 | THOUSAND KICKS: a spinning dash that knocks rivals away |
| **OYAKATA** | DOHYO TRUCK: a heavy blue sumo-ring truck | 4/1/2/5 | HUNDRED PALM ZENITH: plows through everyone, unstoppable for 3 s |
| **BARNACLE** | FORKLIFT: a real forklift, crates on the forks | 3/2/3/4 | FORKLIFT FINALE: drops a wall of crates behind |
| **JALAPEÑO JACK** | CHILLI WAGON: a red pepper-shaped kart with flames | 4/3/2/3 | PEPPER STORM: three fiery peppers fired forward |
| **ROOK** | DUSTER BIKE: a dusty cave-bandit trike | 4/3/3/2 | SNIPER OVERCHARGE: one long-range shot at the leader |
| **LOX** | RING CAR: a red boxing-ring buggy with gloves as bumpers | 3/4/3/3 | KNOCKOUT RUSH: a punching dash through the pack |
| **IRON WARDEN** | WARDEN TANK: Iron Warden on heavy treads (a hacked guard, not a villain) | 4/1/1/5 | DOUBLE ROCKET: two rocket fists fired ahead |
| **MAKER PRIME** | FACTORY CRAWLER: Maker Prime on a drill-nosed crawler | 4/1/2/5 | LASER OVERLOAD: a laser beam down the track |
| **SUDS-9** | GONDOLA KART: SUDS-9 in his window-cleaning gondola | 3/2/3/4 | POWER WASH: soap spray makes the road slippery behind |
| **SLAGBACK** | MAGMA ROCKER: a rock kart on lava tracks | 4/2/2/5 | ERUPTION: lava bursts around the kart |
| **CRYSTAL WARDEN** | PRISM SLED: a crystal sled that glows violet | 4/2/3/4 | PRISM STORM: three crystal shards |
| **BRANNOCK** | HEARTH WAGON: a log-wheeled ironwood wagon with a runestone lamp | 3/2/2/5 | ELDER'S HEARTHFIRE: rune fire rings the kart |
| **OSSU** | ORBITER: a floating saucer that hovers just off the road | 3/3/5/2 | STARFALL: stars fall on the racers ahead |
| **IRISA** | LEAF SKIFF: a leaf-shaped glider kart, very fast to turn | 3/4/5/1 | PRAYING STORM: a scything dash |
| **OSSA GREYCREST** | STORM GLIDER: wings out, glides over gaps and shortcuts | 3/3/4/2 | THUNDERHEAD: lightning strikes the leader |
| **HOBART STEELBACK** | ROUNDHOUSE RIG: a hydraulic gorilla truck | 4/2/2/5 | TURNTABLE THROW: grabs the nearest kart and throws it backwards |
| **AMBRA** | HIVE BUGGY: an amber kart with wings that hovers over honey | 3/3/4/2 | SWARM CALL: a bee swarm chases the racers ahead |
| **ZAYD FARSIGHT** | JET RACER: a tiny kart with twin jets, the fastest accelerator | 2/5/4/1 | FAR SIGHT: spots and hits any racer ahead |
| **TOLLAN** | SWAMP SKIFF: a sandstone hovercraft that swims water shortcuts | 4/1/2/5 | SUNSTONE SURGE: a sun burst, then a long boost |

The 8 leaders (Brannock → Tollan) have **no voice lines yet**. The other 15 have recorded voices in `audio/vo/` (manifest.json, 610 lines). The fighter names, "steps in" and "wins" calls work for the race start and the podium.

## WHAT'S IN THIS ZIP
- `HANDOFF.md` (this file), `characters.json` (all 23: builder, scale, colour, weapon, shot, ride, kart stats, special boost, Fox Fighters specials, voice folder).
- `FoxFighters/`: the complete current Fox Fighters source (build s119). Read-only reference: copy what you need into the new game's folder. See the Gate Brawl hand-off or KIT_CHANGES.md for what each file does.
- `pictures/`: the 8 leaders as the main project builds them, the select screen, and the 8 leaders in a Fox Fighters fight.

## QUESTIONS FOR BEN (ask before step 2)
1. Is the name OK: GATE GRAND PRIX or MERU KART?
2. Are the rides, kart stats and special boosts OK (the table above)?
3. The cups and tracks: which 4 first?
4. Can you bring vehicle-lab.js / Speedboat Bay over from the main project?
5. Should Noble race in his own chair? (Planned: yes, it's his signature.)

## LIVE LINKS
- Fox Fighters: https://claude.ai/artifact/YERmv6QhfNk4wwg9vJUTEQ
- Fighter Workshop (all characters on a turntable, glTF downloads): https://claude.ai/artifact/J1FoKCXJ6818XdPcJAMPk8
- 8 Gates Workshops: https://claude.ai/artifact/SPmgFx3PnjTE23biQ8XsBA
