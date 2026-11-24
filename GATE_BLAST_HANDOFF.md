# GATE BLAST · HAND-OFF (from the Fox Fighters thread, 18 Nov 2026)

Paste this whole file into the new thread first, then upload this zip. **Fox Fighters keeps its own thread.** This is a new, separate game that borrows the Fox Fighters cast.

## WHAT BEN WANTS
A **bomb maze**: a fan tribute to the classic bomb-maze party game.
- Up to 4 players race through a grid arena, drop bombs, and blast crates and each other.
- **The moon leaders' powers are pickups**, like Ambra's honey bombs or Hobart's ground pound.
- **Rounds are short, the rules are simple, and it plays well on a phone.**
- Working name: **GATE BLAST** (or CREST BOMBERS). Ben may rename it.
- **It is a tribute, not a copy.** Use no Konami / Hudson names, logos, characters, music, sounds, pickup designs or stage art. Every bomb, pickup, arena and sound is our own 8 GATES material.

## BEN'S RULES (keep them)
- **Mobile first.** Test every screen at 390 × 844 and 844 × 390. Buttons are 44 px or bigger. The controls must never cover the arena.
- Modernist design system: red on white / ink, square corners, flush-left labels, inline styles (no CSS classes).
- Back up a file before you change it (`backup/*.pre-sNNN.*`). Add an entry to BUILD_PLAN.md every session.
- Lore is canon only when Ben says so. The robots (Iron Warden, Maker Prime, SUDS-9) are the **hacked Machine Fleet: victims, not villains**.
- **Do not edit the shared kit files in place** (engine/*-kit.js, species-armor.js, armor-sets.js, armor-crests.js, species-leaders.js, cast.js, fox-kit.js, fox-kit-moon.js). They are shared with the main 8 GATES project. If one must change, list it in `KIT_CHANGES.md`.
- **Accessibility matters to Ben** (Blind Canvas Project). A grid game can be **played by sound**, so plan the AUDIO GUIDE from the start:
  - a soft tick for each tile you step on, a bump for a wall, a different bump for a crate
  - every bomb ticks in stereo where it sits, faster just before it blows (Hope's bell bomb is the loudest)
  - a **danger hum** whenever you stand in a bomb's blast line, silence when you're safe
  - an ECHO button (Hope's echo): a ping that says which ways are open ("open left and up, crate right")
  - spoken pickups, KOs and "2 foxes left"
  Fox Fighters already has a spoken audio guide to learn from.

## THE GAME (first design, for Ben's OK)
**The arena:** a 13 × 11 grid. Solid pillars in a checker pattern, breakable crates everywhere else; the 4 players start in the corners with a little room to move.

**All the rules:**
1. Move around the grid. Press **BOMB** to drop a bomb on your tile.
2. After 2.5 s it blasts in a **+ shape**, 2 tiles each way. Pillars stop it; it breaks the first crate it hits. A blast sets off any bomb it touches (chain reactions).
3. Caught in a blast = out for the round.
4. Crates sometimes drop a pickup.
5. **Last fox standing wins the round. First to 3 round wins takes the match.**
6. A round lasts 2 minutes. Then the **GATES CLOSE**: the arena edge fills in, tile by tile, until someone wins.

**Basic pickups**

| Pickup | What it does |
|---|---|
| EXTRA BOMB | carry one more bomb at a time |
| BIG BLAST | your blasts reach one tile further |
| QUICK PAWS | walk faster |
| FOX KICK | walk into a bomb to kick it sliding (Ben's kick) |
| GLOVE | press BOMB on your own bomb to throw it 3 tiles (Lox's punch) |
| HACKED CHIP | a random curse for 10 s: reversed controls, tiny blasts, or a bomb every step |

**Moon powers.** These are the leaders' powers as pickups. You hold one at a time and use it with **POWER**.

| Power | Leader | What it does |
|---|---|---|
| **RUNE WALL** | BRANNOCK | Drops a rune stone block in front of you for 8 s: blocks a blast, traps a rival |
| **GRAVITY PULL** | OSSU | Pulls the nearest bomb (up to 5 tiles) to the tile in front of you |
| **LEAF STEP** | IRISA | Dash 3 tiles in a straight line, passing over bombs |
| **STORM HOP** | OSSA GREYCREST | Fly over one wall or crate |
| **GROUND POUND** | HOBART STEELBACK | Stuns rivals within 2 tiles for 1 s and shoves nearby bombs 1 tile away |
| **HONEY BOMB** | AMBRA | Your next bomb leaves honey on its blast tiles: anyone walking there is slowed for 5 s |
| **FAR SIGHT** | ZAYD FARSIGHT | Your next bomb waits: it only blows when you press POWER again (remote) |
| **SUNSTONE SHIELD** | TOLLAN | Survive one blast |

**Knocked out?** You come back as a **ghost fox** on the arena edge and can lob one bomb in from the side every 10 s. If it knocks someone out, you swap places with them and you're back in. Nobody sits around waiting.

**Modes**
- BATTLE: up to 4, any mix of people and computer players. Teams option (2 vs 2).
- **ROBOT RESCUE** (1 to 4 players together): hacked Machine Fleet robots roam the maze. Blast their glowing hack chip (never the robot) to free them; a freed robot helps you. Fits the lore: they're victims.
- Later: a puzzle mode (clear the arena in a set number of bombs) and online play.

**Players and controls**
- **Phone:** 1 player against up to 3 computer players.
  - D-pad on the left thumb; BOMB (big) and POWER on the right.
  - Movement helps round corners: half a tile off, you slide into the gap.
  - Swipe-to-move as an option.
  - Portrait: arena on top, controls below. Landscape: controls at the sides.
- **Tablet:** 2 players on one screen, controls in opposite corners.
- **Computer:** up to 4 **game controllers**. Reuse the Fox Fighters controller code: in `minigames/kyoto/sword-duel.js`, search for `s120` to `s125` (`pollPads`, `padDir`, `padInfo`, `padTeach`). The CONTROLLER SETUP screen is in Kyoto Sword Duel.dc.html. It already handles:
  - Xbox, PlayStation and cheap USB pads
  - hat d-pads and sticks on odd channels
  - phantom channels, and pads that wake up on a push
  - rumble
  Map: A = BOMB, B or X = POWER, START = pause.
- Online comes last (Fox Fighters' online code links 2 phones: engine/duel-net.js + vendor/trystero-nostr.js).

## ARENAS (8 GATES places, one twist each)

| Arena | The twist |
|---|---|
| **PEARL SAIL ROOF** (first) | Plain, to learn on. Gondola rails along one side carry bombs across |
| LUXOR RING | The fox crowd throws a random pickup into the ring every 20 s |
| THE FACTORY | Conveyor belts carry you and your bombs |
| LAVA CAVE | Lava rises from one edge at 1 minute (not 2) |
| CRYSTAL CAVES | Dark: you only see near yourself and around ticking bombs. The audio guide shines here |
| SHASTA (bear forest) | Logs roll down a row now and then, flattening crates and players |
| NEBO (honey hive) | Honey tiles slow you; bombs stick where they land |
| JIDDA (swamp) | Water tiles you can't walk on; lily pads drift |

## BUILD ORDER (one step per message, show Ben each step)
1. **Prototype:** the Pearl Sail Roof arena (13 × 11), Ben against 1 computer player. Includes:
   - grid movement with corner help
   - bombs, + blasts, crates, chain reactions, KOs, best of 3
   - phone controls, tested at 390 × 844 and 844 × 390
2. 4 players, the basic pickups, the GATES CLOSE ending, and computer players that dodge blast lines (the AI must see danger tiles).
3. The 23 characters (walk, drop, cheer and KO poses) and a two-page select screen (FOXES & BOSSES / MOON PEOPLES), as in Fox Fighters.
4. The 8 moon powers. Ghost foxes.
5. The audio guide pass (ticks, stereo bombs, danger hum, echo button).
6. Game controllers for 4 on a computer (reuse the Fox Fighters code). 2 players on a tablet.
7. The other arenas, Robot Rescue, online.

## HOW THE CHARACTERS ARE BUILT (reuse, don't rebuild)
The 23 bodies come from **`minigames/kyoto/duel-foxes.js`** in the Fox Fighters source.
- `foxFighter()` builds the foxes, with a foxKit from fox-kit.js. Ben, Hope and Noble come from engine/cast.js; the bosses use `def.boss` with engine/bosses.js.
- `rigFighter()` builds:
  - the robots (rig warden / prime / suds)
  - Slagback and the Crystal Warden (rig slag / crystal, made with engine/creature-kit.js)
  - **the 8 moon leaders** (rig `leader`, `def.leader = id`, `def.sc` = scale). These use **`minigames/kyoto/duel-moon.js`**, which runs the main project's newer rig `fox-kit-moon.js` + engine/species-leaders.js + the species kits and armour. **Call `initMoon(stage)` once first.**
- Every fighter has `upd(P, dt, f)`, which poses it from a pose object (hands / feet / hip / lean / twist / head yaw). A grid game needs only a few poses: walk, drop a bomb, cheer, KO. The Fox Fighters win poses and taunts work as cheers.
- **Camera:** top-down at a slight angle, so the characters read clearly and the grid stays readable on a phone.
- For a lighter build, the Fighter Workshop has every character as a .gltf model (main + 2 colours).
- For bomb and blast colours: `LEADER_GEAR` in duel-moon.js has each leader's weapon and shot colour, and `LASER_COL` in sword-duel.js has everyone's colour.

## THE CAST · 23
Everyone plays by the same rules, which keeps it simple and fair. What differs is the look of their bomb, their voice and their poses. The 8 leaders also **bring their own power into the game as a pickup** anyone can grab. Everything here is a draft for Ben's OK.

| Character | Bomb look | Their moon power (pickup) |
|---|---|---|
| **BEN** | Blue fox-head bomb with the 8 crest; the fuse is his tail tip | — |
| **HOPE** | Silver bell bomb that rings as it ticks (easy to hear) | — |
| **NOBLE** | Gold bomb with a tiny horn that honks before it blows | — |
| **KING MIGHT** | Purple crown bomb | — |
| **MICHELLE** | Petal bomb that bursts into blue petals | — |
| **OYAKATA** | Round blue rice-ball bomb | — |
| **BARNACLE** | Crate bomb stencilled FRAGILE | — |
| **JALAPEÑO JACK** | Red chilli bomb, flames for the blast | — |
| **ROOK** | Dusty lantern bomb | — |
| **LOX** | Red boxing-glove bomb | — |
| **IRON WARDEN** | Steel rivet bomb (a hacked guard: victim, not villain) | — |
| **MAKER PRIME** | Gear bomb with a laser-red core | — |
| **SUDS-9** | Soap bubble bomb that pops into foam | — |
| **SLAGBACK** | Glowing magma rock bomb | — |
| **CRYSTAL WARDEN** | Violet crystal bomb that shatters | — |
| **BRANNOCK** | Ironwood log bomb with a green rune | RUNE WALL: Drops a rune stone block in front of you for 8 s: blocks a blast, traps a rival |
| **OSSU** | Floating cyan crystal bomb | GRAVITY PULL: Pulls the nearest bomb (up to 5 tiles) to the tile in front of you |
| **IRISA** | Seed-pod bomb | LEAF STEP: Dash 3 tiles in a straight line, passing over bombs |
| **OSSA GREYCREST** | Storm-cloud bomb with lightning | STORM HOP: Fly over one wall or crate |
| **HOBART STEELBACK** | Brass piston bomb | GROUND POUND: Stuns rivals within 2 tiles for 1 s and shoves nearby bombs 1 tile away |
| **AMBRA** | Amber honeycomb bomb | HONEY BOMB: Your next bomb leaves honey on its blast tiles: anyone walking there is slowed for 5 s |
| **ZAYD FARSIGHT** | Brass sand-glass bomb | FAR SIGHT: Your next bomb waits: it only blows when you press POWER again (remote) |
| **TOLLAN** | Sandstone sun bomb | SUNSTONE SHIELD: Survive one blast |

The 8 leaders have **no voice lines yet**. The other 15 have recorded voices in `audio/vo/` (manifest.json, 610 lines); their name, "steps in" and "wins" calls work for the match start and the winner.

## WHAT'S IN THIS ZIP
- `HANDOFF.md` (this file).
- `characters.json`: all 23 characters, with builder, scale, colour, weapon, shot, bomb look, the leaders' power pickups, Fox Fighters specials and voice folder.
- `FoxFighters/`: the complete current Fox Fighters source (build s125, with the controller code). Read-only reference: copy what you need into the new game's folder.
- `pictures/`: the 8 leaders, the select screen, and the 8 leaders in a Fox Fighters fight.

## QUESTIONS FOR BEN (ask before step 3)
1. Is the name OK: GATE BLAST or CREST BOMBERS?
2. Are the 8 moon powers OK (the table above)? Should the foxes and bosses get a power each too, or stay "same rules" players?
3. Ghost foxes: in or out?
4. Robot Rescue: in the first version, or later?
5. Which arena comes after Pearl Sail Roof?

## LIVE LINKS
- Fox Fighters: https://claude.ai/artifact/YERmv6QhfNk4wwg9vJUTEQ
- Fighter Workshop (all characters on a turntable, glTF downloads): https://claude.ai/artifact/J1FoKCXJ6818XdPcJAMPk8
- 8 Gates Workshops: https://claude.ai/artifact/SPmgFx3PnjTE23biQ8XsBA
