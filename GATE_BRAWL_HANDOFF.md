# GATE BRAWL · HAND-OFF (from the Fox Fighters thread, 15 Nov 2026)

Paste this whole file into the new thread first, then upload this zip. **Fox Fighters keeps its own thread.** This is a new, separate game that borrows the Fox Fighters cast.

## WHAT BEN WANTS
A **4-player party brawler**: a fan tribute to the Smash-style platform fighter, starring every Fox Fighters character (23 of them).
- Working name: **GATE BRAWL**. Ben may rename it.
- **It is a tribute, not a copy.** Use no Nintendo names, logos, characters, music, sounds or menu art. Everything is our own: the 8 GATES cast, our stages, our UI (the Modernist design system), our audio.

## BEN'S RULES (keep them)
- **Mobile first.** Test every screen at 390 × 844 and 844 × 390. Buttons are 44 px or bigger. Phone controls must not cover the fighters.
- Modernist design system: red on white / ink, square corners, flush-left labels, inline styles (no CSS classes).
- Back up a file before you change it (`backup/*.pre-sNNN.*`). Add an entry to BUILD_PLAN.md every session.
- Lore is canon only when Ben says so. The robots (Iron Warden, Maker Prime, SUDS-9) are the **hacked Machine Fleet: victims, not villains**. Never write a robot as the bad guy.
- **Do not edit the shared kit files in place** for a game-only reason: engine/*-kit.js, species-armor.js, armor-sets.js, armor-crests.js, species-leaders.js, cast.js, fox-kit.js, fox-kit-moon.js. They are shared with the main 8 GATES project. If one must change, list every change in `KIT_CHANGES.md`.
- **Accessibility matters to Ben** (Blind Canvas Project). Fox Fighters has an AUDIO GUIDE: spoken menus, distance beeps, attack-height cues and a one-button control mode. Plan for the same in Gate Brawl.

## THE GAME (first design, for Ben's OK)
**Rules**
- **No health bars.** Every hit adds DAMAGE %. Knockback grows with %. A simple formula to start:
  - knockback = base + damage% × growth ÷ weight
- **Stocks.** 3 lives each. You lose one by flying past the blast zone (off any screen edge). Last one standing wins. Also a TIME mode: most KOs in 2 minutes.
- Up to **4 fighters**: free-for-all, or 2-vs-2 teams with team colours.
- Jumping: a double jump, a ledge grab with a short hold, and the UP SPECIAL as each fighter's recovery.
- Shields and dodges: hold block (a bubble that shrinks), roll and spot-dodge.
- Items, which can be switched off:
  - FOX BEAM orb (one free beam)
  - SHOEMERANG (throwable)
  - HONEY JAR (slows whoever it hits)
  - SUNSTONE (heal 30 %)
  - GATE KEY (fills the super bar)

**Controls** (the same buttons as Fox Fighters, so players already know them)
- PUNCH = attack, KICK = strong attack, hold PUNCH = weapon (sword slot), hold KICK = shot (laser slot), SPECIAL ★ + a direction = the four specials, full bar + ★ = FINAL BLOW (the super).
- Keyboard players: P1 uses the Fox Fighters keys; P2 to P4 use game controllers (Gamepad API).
- **Phone: 1 player against up to 3 CPUs.** Four people can't share one phone screen. Online 4-player comes later; Fox Fighters' online code links 2 phones (engine/duel-net.js + vendor/trystero-nostr.js).

**Camera.** It zooms out to keep every fighter in view, with a minimum and a maximum zoom. Arrows at the screen edge show where an off-screen fighter is.

**Stages** (rebuild Fox Fighters' arenas as floating platforms with blast zones):
- PEARL SAIL ROOF (helipad + gondola)
- LAVA CAVE (lava rises every 30 s)
- CRYSTAL CAVES (floating crystal platforms)
- THE FACTORY (moving conveyor platform)
- LUXOR RING (fox crowd, ropes as soft walls)
- The 8 moons later: SHASTA, LUXOR, UR, GAYA, ZION, NEBO, KUFA, JIDDA. Each moon is a leader's home stage.

## BUILD ORDER (one step per message, show Ben each step)
1. **Prototype:** 1 player against 3 CPUs on PEARL SAIL ROOF with Ben, Hope, Noble and Tollan. Damage %, knockback, ring-outs, 3 stocks, the zoom camera. Phone-test it.
2. All 23 fighters on a 4-player select screen. Keep Fox Fighters' two pages (FOXES & BOSSES / MOON PEOPLES), with 4 cursors and colours.
3. The four specials per fighter, plus up-special recovery tuning: the winged ones (Ossa, Ambra, Zayd) get extra air jumps; the heavies (Oyakata, Tollan, Iron Warden, Hobart, Brannock) recover poorly on purpose.
4. Items, teams, TIME mode, more stages.
5. 4 game controllers on a computer.
6. Online 4-player.
7. The audio guide and accessibility pass, voice lines for the 8 leaders, results screen, trophies.

## HOW THE FIGHTERS ARE BUILT (reuse, don't rebuild)
All 23 bodies come from **`minigames/kyoto/duel-foxes.js`** in the Fox Fighters source.
- `foxFighter({ THREE, kit, M, toon }, key, def)` builds the foxes. It needs a foxKit from fox-kit.js. Ben, Hope and Noble come from engine/cast.js; the others use `def.boss` with engine/bosses.js.
- `rigFighter({ THREE, M, toon }, def)` builds:
  - the robots (rig warden / prime / suds)
  - Slagback and the Crystal Warden (rig slag / crystal, made with engine/creature-kit.js)
  - **the 8 moon leaders** (rig `leader`, `def.leader = id`, `def.sc` = scale). These use **`minigames/kyoto/duel-moon.js`**, which runs the main project's newer rig `fox-kit-moon.js` + engine/species-leaders.js + the species kits + species armour. **Call `initMoon(stage)` once before building a leader.**
- Every fighter returns the same interface:
  - `g` (group), `upd(P, dt, f)`, which poses it from a pose object P (hands / feet / hip / lean / twist …)
  - `limb(kind)`, the world point of the punching paw or kicking foot (use it for hitboxes)
  - `sw`, the weapon holder (`sw.userData.tip` is the reach point)
  - `gunTip`, where shots fire from
  - `L.H` (height), `hw` (half width), `head`
- The poses (stance, punch, kick, sweep, swing, laser, specials, hurt, win, intro) live in **`minigames/kyoto/sword-duel.js`**: `poseOf()`, `winPose`, `introPose`. **That file is a 2-fighter engine** (ben vs opp), so do not try to bend it into 4 players. Write a new engine (e.g. `minigames/brawl/brawl.js`). Import the builders from duel-foxes.js, and port `poseOf()` and the special-move functions (beamAct, tatsuAct, maxDash, maxRise, mightQuake, wrenDive, pennyCoins, foxThrow, sprayAct …) to work on N fighters.
- The special-move data per fighter is in sword-duel.js: `SIG` (names, colours, damage, which move each uses), `SUPER` (supers), `LASER_COL` (shot colours) and `LEADER_GEAR` in duel-moon.js. **characters.json** in this zip holds all of it in one place.
- The fighter models are also exported as .glb files (main colour + 2 alt colours) in the Fighter Workshop, for previews or a lighter build.

## THE CAST · 23 FIGHTERS
Stats are Fox Fighters' POWER / SPEED / HEALTH (1–5). Weight = Fox Fighters health ÷ 1.8 (a starting point for knockback). The special mapping is a proposal for Ben:
- NEUTRAL ★ = their fireball-slot special
- SIDE ★ = their spin / dash special
- UP ★ = their rising special (the recovery)
- DOWN ★ = their flurry (could become a counter)
- FINAL BLOW = their super

| Fighter | Who | Weight | Pow/Spd/HP | Neutral ★ | Side ★ | Up ★ (recovery) | Down ★ | Final blow |
|---|---|---|---|---|---|---|---|---|
| **BEN** (`ben`) | Fox · the hero | MEDIUM (96) | 3/3/3 | FOX BEAM | WHIRLWIND KICK | FOX POP | FOX FLURRY | **FOX BEAM MAX** |
| **HOPE** (`hope`) | Fox · blind, hears everything | MEDIUM (99) | 3/5/3 | VAULT DIVE | CANE VAULT | CANE FLIP | CANE FLURRY | **STARDUST VAULT** |
| **NOBLE** (`noble`) | Fox · electric wheelchair | LIGHT (88) | 4/3/4 | SHOEMERANG | ROLLING CHAIR | WHEELIE | THUNDER WHEELS | **THUNDER CHAIR** |
| **KING MIGHT** (`might`) | Fox · King of Meru | MEDIUM (97) | 5/3/4 | ROYAL CRUSHER | KNEE PRESS | CROWN UPPERCUT | ROYAL POUND | **ROYAL DECREE** |
| **MICHELLE** (`michelle`) | Fox · Princess of Meru | LIGHT (90) | 2/5/3 | PALM BLAST | SPINNING CRANE KICK | PETAL RISE | LIGHTNING KICKS | **THOUSAND KICKS** |
| **OYAKATA** (`sumo`) | Fox · OYAKATA, sumo master | MEDIUM (100) | 5/1/3 | SUMO TORPEDO | BELLY SPLASH | SUMO LIFT | HUNDRED PALM | **HUNDRED PALM ZENITH** |
| **BARNACLE** (`barnacle`) | Fox · bandit, the Salt crew | MEDIUM (98) | 5/2/3 | CRATE TOSS | FORKLIFT SLAM | FORK LIFT | SALT FLURRY | **FORKLIFT FINALE** |
| **JALAPEÑO JACK** (`jack`) | Fox · bandit, pepper slinger | LIGHT (89) | 3/3/5 | PEPPER BOOM | CHILLI FLIP | CHILLI FLIP | JALAPEÑO JABS | **PEPPER STORM** |
| **ROOK** (`rook`) | Fox · cave bandit, sniper | MEDIUM (94) | 3/3/5 | SNIPER BEAM | DUSTER DASH | ROOK RISE | BANDIT BARRAGE | **SNIPER OVERCHARGE** |
| **LOX** (`lox`) | Fox · Luxor leader, boxer | MEDIUM (94) | 5/3/2 | DASH STRAIGHT | DASH UPPER | DASH UPPER | BODY BLOWS | **KNOCKOUT RUSH** |
| **IRON WARDEN** (`warden`) | Robot · Iron Warden (a hacked arena guard: a victim, not a villain) | HEAVY (107) | 5/1/4 | ROCKET PUNCH | STOMP | IRON UPPERCUT | PISTON PUNCHES | **DOUBLE ROCKET** |
| **MAKER PRIME** (`prime`) | Robot · Maker Prime (hacked factory robot) | MEDIUM (100) | 5/1/5 | LASER EYE | DRILL SPIN | DRILL UPPER | CLAW FLURRY | **LASER OVERLOAD** |
| **SUDS-9** (`suds`) | Robot · SUDS-9, window cleaner (hacked) | HEAVY (118) | 4/2/4 | RINSE CYCLE | SPIN CYCLE | SQUEEGEE UP | SCRUB FLURRY | **POWER WASH** |
| **SLAGBACK** (`slag`) | Lava creature · Slagback | HEAVY (111) | 4/2/3 | LAVA LOB | MAGMA SLAM | ERUPTION | MOLTEN FISTS | **ERUPTION** |
| **CRYSTAL WARDEN** (`crystal`) | Crystal golem · Crystal Warden | HEAVY (106) | 4/2/4 | CRYSTAL SHARD | GEM CYCLONE | CRYSTAL RISE | PRISM PUNCHES | **PRISM STORM** |
| **BRANNOCK** (`brannock`) | Bear · Hearth Elder of SHASTA (the oldest bear) | HEAVY (106) | 5/2/4 | HEARTH SLAM | LOG ROLL | RUNE ROAR | BEAR PAWS | **ELDER'S HEARTHFIRE** |
| **OSSU** (`ossu`) | Grey alien · Old Navigator of LUXOR | MEDIUM (100) | 2/4/3 | STAR CHART | GRAV PULL | LOG FLASH | CRYSTAL TAPS | **STARFALL** |
| **IRISA** (`irisa`) | Mantis · Still Mother of UR | MEDIUM (94) | 3/5/2 | LEAF STEP | TWIN SCYTHE | STILL COUNTER | SCYTHE FLURRY | **PRAYING STORM** |
| **OSSA GREYCREST** (`ossa`) | Gryphon · the Stormwarden of GAYA (blind, reads the wind) | MEDIUM (100) | 3/4/3 | STORM DIVE | WING GUST | LIGHTNING CALL | TALON FLURRY | **THUNDERHEAD** |
| **HOBART STEELBACK** (`hobart`) | Gorilla · Boss of the Roundhouse, ZION | HEAVY (106) | 5/2/4 | PISTON PUNCH | GROUND POUND | STEELBACK UPPER | RAM RUSH | **TURNTABLE THROW** |
| **AMBRA** (`ambra`) | Bee · Speaker of the Hive, NEBO | MEDIUM (100) | 3/4/3 | STING RUSH | HONEY TRAP | HIVE RISE | BUZZ FLURRY | **SWARM CALL** |
| **ZAYD FARSIGHT** (`zayd`) | Spy fly · Elder of the Dustwings, KUFA (one milky eye) | MEDIUM (100) | 2/5/3 | JET DASH | SCARF WHIP | TELESCOPE POP | DUSTWING JABS | **FAR SIGHT** |
| **TOLLAN** (`tollan`) | Gator · Grand Basker of JIDDA (the biggest) | HEAVY (111) | 5/1/5 | TAIL SWEEP | DEATH ROLL | GATOR SNAP | GATOR SNAPS | **SUNSTONE SURGE** |

### What each one carries
| Fighter | Built with | Weapon (SWORD button) | Shot (LASER button) | Recovery idea | Voice folder |
|---|---|---|---|---|---|
| BEN | foxFighter cast "player" | katana on his back | FOX laser pistol (sky blue) | RISING FOX uppercut + double jump | `ben` |
| HOPE | foxFighter cast "hope" (caneArm 1) | katana on her back + her long CANE (far hand) | laser pistol (near hand) | CANE VAULT: pole-vault up and across | `hope` |
| NOBLE | foxFighter cast "noble" + chair kit + nobleWeaponKit | sword sheathed on the chair back (DRAW CUT, hits low) | SHOEMERANG boot | WHEELIE jump + THUNDER WHEELS spark boost | `noble` |
| KING MIGHT | foxFighter boss "king" | katana | laser | CROWN UPPERCUT | `might` |
| MICHELLE | foxFighter boss "michelle" | katana | laser | PETAL RISE spinning kick | `michelle` |
| OYAKATA | foxFighter boss "sumo" (big blue mitts) | katana | laser | SUMO LIFT (short, heavy: poor recovery on purpose) | `sumo` |
| BARNACLE | foxFighter boss "barnacle" | katana | laser | FORK LIFT | `barnacle` |
| JALAPEÑO JACK | foxFighter boss "jack" | katana | laser | CHILLI FLIP | `jack` |
| ROOK | foxFighter boss "rook" | katana | rifle-style laser (lime) | ROOK RISE | `rook` |
| LOX | foxFighter boss "lox" (boxing gloves) | katana (same back fit as Ben) | laser | DASH UPPER | `lox` |
| IRON WARDEN | rigFighter rig "warden" (big red gloves, ears, hip + eye laser) | double-sided AXE on his back | eye laser + hip laser (orange) | IRON UPPERCUT + rocket punch | `warden` |
| MAKER PRIME | rigFighter rig "prime" (claw + drill arm) | DRILL ARM (thrust, pulses) | LASER EYE (red) | DRILL UPPER | `prime` |
| SUDS-9 | rigFighter rig "suds" (squeegee, hose hand) | SQUEEGEE spin | water burst / soap spray | SQUEEGEE UP | `suds9` |
| SLAGBACK | rigFighter rig "slag" (creature-kit, lava gloves, red eyes) | LAVA AXE | LAVA LOB: digs lava from his chest, fireball explodes | ERUPTION | `slag` |
| CRYSTAL WARDEN | rigFighter rig "crystal" (creature-kit Deep Warden) | crystal GREATSWORD | CHEST BLAST from his core (violet) | CRYSTAL RISE | `crystal` |
| BRANNOCK | rigFighter rig "leader" (species-leaders makeLeader, armour: IRONWOOD BULWARK) | black-iron RUNE STAFF | RUNE BOLT (green) | RUNE ROAR | `none yet` |
| OSSU | rigFighter rig "leader" (ORBITAL WARDEN armour) | floating LOG-CRYSTAL | CRYSTAL BEAM (cyan) | LOG FLASH (could float: he hovers) | `none yet` |
| IRISA | rigFighter rig "leader" (MANTIS CARAPACE armour) | SCYTHE ARM | LEAF BLADE (green) | STILL COUNTER (leap) | `none yet` |
| OSSA GREYCREST | rigFighter rig "leader" (STORM AERIE PLATE, wings) | white STORM STAFF | STORM BOLT (pale blue) | wings: best recovery in the game, extra mid-air jumps | `none yet` |
| HOBART STEELBACK | rigFighter rig "leader" (TITAN EXO-FRAME) | hydraulic KNUCKLE RAM | PISTON BLAST (yellow) | STEELBACK UPPER (short) | `none yet` |
| AMBRA | rigFighter rig "leader" (HIVEGUARD AMBERPLATE, wings) | STINGER SCEPTRE | STING DART (amber) | hover with wings | `none yet` |
| ZAYD FARSIGHT | rigFighter rig "leader" (SKYRACER FLIGHT RIG, jets) | BRASS TELESCOPE | GLINT SHOT (teal) | JET DASH in any direction | `none yet` |
| TOLLAN | rigFighter rig "leader" (SUNSTONE SENTINEL, tail) | carved SANDSTONE STAFF | SUN BOLT (teal) | GATOR SNAP (short, heavy) | `none yet` |

The 8 leaders (Brannock → Tollan) have **no voice lines yet**, and their specials and supers are **drafts waiting for Ben's OK**. The other 15 have recorded voices in `audio/vo/` (manifest.json lists 610 lines, including fighter names, "steps in", "wins", and percent-health calls that could become damage-% calls).

## WHAT'S IN THIS ZIP
- `HANDOFF.md` (this file), `characters.json` (the 23 fighters as data: builder, scale, colour, weapon, shot, stats, proposed specials, voice folder).
- `FoxFighters/`: the complete current Fox Fighters source (build s119). Read-only reference: copy what you need into the new game's folder.
  - `minigames/kyoto/duel-foxes.js`, `duel-moon.js`: the fighter builders.
  - `minigames/kyoto/sword-duel.js`: poses, moves, specials, supers, stages, audio guide, phone controls. Reference to port from.
  - `Kyoto Sword Duel.dc.html` / `Pearl Roof Duel.html`: the UI (select screen with two pages, move list, phone buttons).
  - `fox-kit.js`: rig for the 15 original fighters. `fox-kit-moon.js`: the main project's newer rig, for the 8 leaders only.
  - `engine/`: cast, cane, chair, noble-weapons, bosses, creature-kit, species-leaders + 8 species kits + species-armor + armor-sets + armor-crests, meru-faces, fox-mouth3d, duel-net.
  - `audio/vo/`: all voices (`vo2pack.mp3` holds 356 lines; manifest.json maps them).
  - `KIT_CHANGES.md` (no shared kit file was changed), `BUILD_PLAN.md` (the Fox Fighters history).
- `pictures/`: the 8 leaders as the main project builds them, the select screen, and the 8 leaders in a Fox Fighters fight.

## QUESTIONS FOR BEN (ask before step 2)
1. Is the name GATE BRAWL OK?
2. Is the special mapping above OK (neutral / side / up / down / final blow)?
3. Should the moon leaders' home stages be their moons?
4. Items on or off by default?
5. Should the old leaders (Ossa is blind, Zayd has one milky eye, Brannock is the oldest bear) fight in Gate Brawl too? In Fox Fighters, Ben said yes, the leaders fight.

## LIVE LINKS
- Fox Fighters (the game these fighters come from): https://claude.ai/artifact/YERmv6QhfNk4wwg9vJUTEQ
- Fighter Workshop (all fighters on a turntable, glTF downloads): https://claude.ai/artifact/J1FoKCXJ6818XdPcJAMPk8
- 8 Gates Workshops: https://claude.ai/artifact/SPmgFx3PnjTE23biQ8XsBA
