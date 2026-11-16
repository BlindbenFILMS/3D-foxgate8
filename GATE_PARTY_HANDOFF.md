# GATE PARTY · HAND-OFF (from the Fox Fighters thread, 15 Nov 2026)

Paste this whole file into the new thread first, then upload this zip. **Fox Fighters keeps its own thread.** This is a new, separate game that borrows the Fox Fighters cast.

## WHAT BEN WANTS
A **party board game**: a fan tribute to the classic party board game, starring every Fox Fighters character (23 of them).
- Working name: **GATE PARTY** (or CREST QUEST). Ben may rename it.
- **It is a tribute, not a copy.** Use no Nintendo names, logos, characters, music, sounds, minigame designs or board art. Every board, space, item and minigame is our own 8 GATES material.
  - Our names for things: **Meru coins** (not "coins" with another brand's look), **GATE CRESTS** (the prize you buy, in place of stars), the **Gatekeeper** (the host who sells crests).

## BEN'S RULES (keep them)
- **Mobile first.** Test every screen at 390 × 844 and 844 × 390. Buttons are 44 px or bigger.
- Modernist design system: red on white / ink, square corners, flush-left labels, inline styles (no CSS classes).
- Back up a file before you change it (`backup/*.pre-sNNN.*`). Add an entry to BUILD_PLAN.md every session.
- Lore is canon only when Ben says so. The robots (Iron Warden, Maker Prime, SUDS-9) are the **hacked Machine Fleet: victims, not villains**.
- **Do not edit the shared kit files in place** (engine/*-kit.js, species-armor.js, armor-sets.js, armor-crests.js, species-leaders.js, cast.js, fox-kit.js, fox-kit-moon.js). They are shared with the main 8 GATES project. If one must change, list it in `KIT_CHANGES.md`.
- **Accessibility is the heart of this one** (Ben runs the Blind Canvas Project). A board game is turn-based, so it can be **fully playable by sound from day one**:
  - every roll, move, space and coin change is spoken
  - "Where am I?" button: your space, coins, crests, and distance to the crest
  - "Who's winning?" button: the standings read aloud
  - every minigame needs an audio version (sound cues, stereo panning), or a fair audio alternative
  Fox Fighters already has a spoken audio guide, and **Blind Canvas Games** (Ben's audio-led minigames) are made for exactly this.

## THE GAME (first design, for Ben's OK)
**A turn**
1. Everyone rolls. Roll the normal 1–6 die, **or your own character dice block** (see the table): riskier faces, coin faces.
2. Move. Pass the Gatekeeper with 20 Meru coins and you can buy a **GATE CREST**; the crest then moves somewhere else on the board.
3. Land on a space:

| Space | What happens |
|---|---|
| BLUE | +3 coins |
| RED | −3 coins |
| ? EVENT | a board event (each board has its own) |
| ITEM | get an item |
| DUEL | a 1-on-1 minigame with any rival, for coins |
| LUCKY | a free item or coins (a wheel) |
| ROBOT | a hacked Machine Fleet robot appears; free it in a team minigame and everyone wins coins |

4. When all 4 have moved: **a minigame**. Free-for-all, 2 vs 2, or 1 vs 3. Winners get 10 coins.

**End:** after 10, 15 or 20 turns. Most crests wins; coins break ties. Bonus crests at the end (most minigames won, most coins collected, most spaces moved), revealed one by one.

**Items** (our own): DOUBLE DIE, TRIPLE DIE, SHOEMERANG (steal 5 coins), HONEY TRAP (place a trap on a space), GATE WARP (swap with a random player), CREST KEY (open a shortcut gate), SUNSTONE (+3 to your roll).

**Board power.** Each character has one board power, made from their Fox Fighters super. You can use it once per game (see the table).

**Modes**
- PARTY: 4 players, any mix of people and computer players.
- MINIGAME MODE: just play the minigames.
- PARTNER PARTY: 2 vs 2 teams that share coins and crests.

**Players**
- **Pass-and-play on one phone or tablet**, 1 to 4 people.
- Computer: up to 4 game controllers (Gamepad API).
- Online play comes later (Fox Fighters' code links 2 phones: engine/duel-net.js + vendor/trystero-nostr.js).

## BOARDS (8 GATES places)
| Board | The twist |
|---|---|
| **PEARL SAIL TOWER** (first board) | Floors linked by gondolas; the helipad event flies you to a random floor |
| LUXOR RING | The fox crowd cheers: land on the ring and you can bet coins on a boxing minigame |
| THE FACTORY | Conveyor belts move you after you land; free the robots to shut off the belts |
| LAVA CAVE | Lava rises every 5 turns and covers the lowest spaces |
| CRYSTAL CAVES | Dark: only the spaces near you are lit (the audio version leads by sound) |
| MOON GATES | 8 small islands, one per moon people; their leader sits on each and gives a gift if you visit |

## MINIGAMES · first 12 (all our own)
| Minigame | Type | Idea |
|---|---|---|
| SWORD CLASH | 1v1 / FFA | Fox Fighters duel, 1 hit wins |
| LASER TAG | FFA | Dodge the bolts, last fox standing |
| LOX'S RING | 1v1 | 30-second boxing, most punches landed |
| SHOE TOSS | FFA | Ben's shoemerang: hit the targets |
| HONEY GRAB | FFA | Ambra's hive: grab honey, avoid the bees |
| GRAVITY PULL | 2v2 | Ossu pulls; tug of war |
| LAVA HOP | FFA | Jump the rising stones |
| CRATE STACK | 1v3 | Barnacle's forklift: stack the crates higher |
| PEPPER DODGE | FFA | Jack's peppers rain down |
| ECHO MAZE | FFA | Find the exit by sound alone (great for everyone) |
| ROBOT RESCUE | team | Free a hacked robot together |
| STORM DIVE | FFA | Ossa's wings: dive through the rings |

Ask Ben which **Blind Canvas Games** can be added as minigames; they are already audio-led.

## BUILD ORDER (one step per message, show Ben each step)
1. **Prototype:** the Pearl Sail Tower board, 4 players (Ben, Hope, Noble, Lox), dice, movement, blue/red spaces, coins, the Gatekeeper and crests, 10 turns, and spoken turns from the start. Phone-test it.
2. The 23 characters on the board (idle, walk, cheer and sulk poses), dice blocks, a select screen with two pages (FOXES & BOSSES / MOON PEOPLES) as in Fox Fighters.
3. 3 minigames + the minigame flow after each round (rules screen, play, results).
4. Items, all space types, board powers, the end-of-game bonus crests.
5. 9 more minigames, each with its audio version.
6. More boards, partner party, game controllers on a computer.
7. Online play.

## HOW THE CHARACTERS ARE BUILT (reuse, don't rebuild)
The 23 bodies come from **`minigames/kyoto/duel-foxes.js`** in the Fox Fighters source.
- `foxFighter()` builds the foxes, with a foxKit from fox-kit.js. Ben, Hope and Noble come from engine/cast.js; the bosses use `def.boss` with engine/bosses.js.
- `rigFighter()` builds:
  - the robots (rig warden / prime / suds)
  - Slagback and the Crystal Warden (rig slag / crystal, made with engine/creature-kit.js)
  - **the 8 moon leaders** (rig `leader`, `def.leader = id`, `def.sc` = scale). These use **`minigames/kyoto/duel-moon.js`**, which runs the main project's newer rig `fox-kit-moon.js` + engine/species-leaders.js + the species kits and armour. **Call `initMoon(stage)` once first.**
- Every fighter has `upd(P, dt, f)`, which poses it from a pose object (hands / feet / hip / lean / twist / head yaw). The board poses (walk, hop, cheer, sulk, roll the dice) are a few new poses on the same system. The Fox Fighters win poses and taunts already work as cheers.
- For a lighter build, the Fighter Workshop has every character as a .gltf model (main + 2 colours) in its fight stance.
- Every fighter's specials and moves (`SIG`, `SUPER` in sword-duel.js) make minigame ideas. **characters.json** in this zip has everything in one place.

## THE CAST · 23
Dice blocks are a first guess from each fighter's Fox Fighters style: the heavies are all-or-nothing (0s and big numbers), the fast ones are steady, and the thrifty ones have coin faces. A number moves you that many spaces; **+Nc** = move 0, gain N coins; **−2c** = move 0, lose 2 coins. Everything here is a draft for Ben's OK.

| Character | Dice block | Board power (once per game) |
|---|---|---|
| **BEN** | 1 · 2 · 3 · 4 · 5 · 6 | FOX BEAM: knocks 5 coins off the nearest rival |
| **HOPE** | 2 · 3 · 3 · 4 · 4 · 5 | STARDUST VAULT: jump over the next 6 spaces, skipping any trap |
| **NOBLE** | 0 · 0 · +3c · 6 · 6 · 7 | THUNDER CHAIR: zap everyone on your space and the next 3; they lose 3 coins each |
| **KING MIGHT** | 1 · 3 · 3 · 5 · 5 · +2c | ROYAL DECREE: choose which space event happens to the player in the lead |
| **MICHELLE** | 1 · 1 · 4 · 4 · 6 · 6 | THOUSAND KICKS: kick a rival back 5 spaces |
| **OYAKATA** | 0 · 0 · 7 · 7 · 8 · 8 | HUNDRED PALM ZENITH: stand your ground: nobody can steal from you for a full round |
| **BARNACLE** | 2 · 2 · 3 · 3 · +2c · +2c | FORKLIFT FINALE: drop a crate on a space; the next player to land loses a turn |
| **JALAPEÑO JACK** | 1 · 2 · 4 · 6 · 7 · -2c | PEPPER STORM: three rivals of your choice move back 2 |
| **ROOK** | 0 · +3c · 4 · 5 · 6 · 8 | SNIPER OVERCHARGE: steal 8 coins from anyone on the board |
| **LOX** | 3 · 3 · 3 · 4 · 4 · 4 | KNOCKOUT RUSH: challenge one rival to a 1-on-1 minigame; the winner takes 10 coins |
| **IRON WARDEN** | 0 · 0 · 5 · 5 · 10 · 10 | DOUBLE ROCKET: fire at two rivals, 4 coins each |
| **MAKER PRIME** | 0 · 1 · 6 · 6 · 9 · 9 | LASER OVERLOAD: blast a line of 8 spaces; everyone on it loses 5 coins |
| **SUDS-9** | 1 · 2 · 2 · 3 · +3c · +3c | POWER WASH: wash every trap off the board |
| **SLAGBACK** | 0 · 0 · 6 · 8 · 8 · 10 | ERUPTION: turn 3 spaces near you to lava; landing there costs 5 coins |
| **CRYSTAL WARDEN** | 2 · 2 · 4 · 4 · 6 · 6 | PRISM STORM: copy the last board power anyone used |
| **BRANNOCK** | 0 · 5 · 5 · 6 · 6 · +2c | ELDER'S HEARTHFIRE: everyone on your team (or just you) gains 6 coins |
| **OSSU** | 1 · 2 · 3 · 5 · 8 · +2c | STARFALL: re-roll the location of the next GATE CREST |
| **IRISA** | 3 · 3 · 4 · 4 · 5 · 5 | PRAYING STORM: wait in place, then pounce: move to any rival and steal 6 coins |
| **OSSA GREYCREST** | 1 · 2 · 5 · 5 · 9 · -2c | THUNDERHEAD: fly to any space within 12 |
| **HOBART STEELBACK** | 0 · 0 · 6 · 6 · 9 · 9 | TURNTABLE THROW: swap places with any rival |
| **AMBRA** | 2 · 3 · 3 · 4 · +3c · +3c | SWARM CALL: bees follow the leader for a round; they lose 2 coins per space |
| **ZAYD FARSIGHT** | 4 · 4 · 4 · 5 · 5 · -2c | FAR SIGHT: see what is in every hidden ? block and pick one |
| **TOLLAN** | 0 · 0 · +4c · 7 · 7 · 7 | SUNSTONE SURGE: double the coins you get from your next minigame |

The 8 leaders (Brannock → Tollan) have **no voice lines yet**. The other 15 have recorded voices in `audio/vo/` (manifest.json, 610 lines): names, "steps in" and "wins" calls work for turns and the results screen.

## WHAT'S IN THIS ZIP
- `HANDOFF.md` (this file), `characters.json` (all 23: builder, scale, colour, weapon, shot, dice block, board power, Fox Fighters specials, voice folder).
- `FoxFighters/`: the complete current Fox Fighters source (build s119). Read-only reference: copy what you need into the new game's folder.
- `pictures/`: the 8 leaders, the select screen, and the 8 leaders in a Fox Fighters fight.

## QUESTIONS FOR BEN (ask before step 2)
1. Is the name OK: GATE PARTY or CREST QUEST?
2. Are the dice blocks and board powers OK (the table above)?
3. Which board first? (Planned: Pearl Sail Tower.)
4. Which Blind Canvas Games can become minigames? And can the boxing game from your adventure game come over as a minigame?
5. Who is the Gatekeeper: a new character, or someone from 8 GATES?

## LIVE LINKS
- Fox Fighters: https://claude.ai/artifact/YERmv6QhfNk4wwg9vJUTEQ
- Fighter Workshop (all characters on a turntable, glTF downloads): https://claude.ai/artifact/J1FoKCXJ6818XdPcJAMPk8
- 8 Gates Workshops: https://claude.ai/artifact/SPmgFx3PnjTE23biQ8XsBA
