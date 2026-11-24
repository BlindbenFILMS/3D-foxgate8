# MERU CITY RUMBLE · HAND-OFF (from the Fox Fighters thread, 18 Nov 2026)

Paste this whole file into the new thread first, then upload this zip. **Fox Fighters keeps its own thread.** This is a new, separate game that borrows the Fox Fighters cast.

## WHAT BEN WANTS
A **side-scrolling street brawler**, a fan tribute to the classic beat-'em-ups. **Ben loooooves River City Ransom**, so its spirit leads:
- an **open city** you walk back and forth through, not a straight line of levels
- **coins** from every enemy you beat, and **shops** to spend them in
- **food that heals and raises your stats for good**
- **scrolls that teach new moves**
- **funny defeat shouts**
- **2 players together**
From the street brawlers that came after it, take the extras:
- **picking up and throwing anything**
- **grabs and throws**
- a **call-a-friend** assist
- bosses with personality

Working name: **MERU CITY RUMBLE** (or STREETS OF MERU). Ben may rename it.

**It is a tribute, not a copy.** Use none of their names, characters, gangs, shouts, music, sounds or art. Every street, gang, shop, food and shout is our own 8 GATES material.

## BEN'S RULES (keep them)
- **Mobile first.** Test every screen at 390 × 844 and 844 × 390. Buttons are 44 px or bigger. The controls must never cover the fight.
- Modernist design system: red on white / ink, square corners, flush-left labels, inline styles (no CSS classes).
- Back up a file before you change it (`backup/*.pre-sNNN.*`). Add an entry to BUILD_PLAN.md every session.
- **Lore is canon only when Ben says so.** The story below is a draft. The robots (Iron Warden, Maker Prime, SUDS-9) are the **hacked Machine Fleet: victims, not villains**. Beating a robot **breaks its hack**: it sits down, its eyes turn blue and it waves. It is never destroyed.
- **Do not edit the shared kit files in place** (engine/*-kit.js, species-armor.js, armor-sets.js, armor-crests.js, species-leaders.js, cast.js, fox-kit.js, fox-kit-moon.js). They are shared with the main 8 GATES project. If one must change, list it in `KIT_CHANGES.md`.
- **Accessibility matters to Ben** (Blind Canvas Project). Plan the AUDIO GUIDE from the start:
  - each enemy has a sound (footsteps, a hum for robots) panned to where they stand, nearer = louder
  - a warning sound just before an enemy swings: a high ding means block, a low boom means jump (Fox Fighters already has these cues)
  - spoken "3 left", "go right", coin pickups, and the district name as you arrive
  - **every shop, menu and map read aloud**; the city map can be walked by sound ("Pepper Market is to the east")
  Fox Fighters already has a spoken audio guide to learn from.

## THE STORY (draft for Ben's OK)
Someone is **hacking the Machine Fleet**. While the robots run wild, three **bandit gangs** take over Meru's districts:
- the **Salt Crew** (dockworkers, from the Salt Building)
- the **Pepper Crew** (red bandanas, from the Pepper Building)
- the **Dusters** (cave bandits from the Ruins)

**Ben, Hope and Noble** walk the city: they beat each gang boss, free each hacked robot, and follow the hack to the **Pearl Sail rooftop**. **Who is behind the hack is Ben's to decide.** Leave a placeholder.

Beaten bosses **become friends and join you** as playable characters. That is the River City spirit: the city slowly comes over to your side.

## HOW IT PLAYS (first design, for Ben's OK)
**Fighting** (belt-scroll: walk left/right and up/down between lanes):
- **PUNCH**, **KICK**, **JUMP**, **SPECIAL**. Tap PUNCH for a 3-hit combo. Jump + KICK for a flying kick. Double-tap a direction to run; run + PUNCH for a dash attack.
- **Grab:** walk into a dizzy enemy. Then PUNCH for knees, or a direction + KICK to throw them, into other enemies too.
- **Specials:** each character's Fox Fighters moves, using the same inputs (↓ ↘ → + PUNCH and so on). A special costs a little health unless your SPIRIT bar is full.
- **Super:** each character's Fox Fighters super, when the SPIRIT bar is full.
- **Call a friend** (once per district): a freed robot or a joined boss runs in for one big move. For example, SUDS-9 power-washes the whole screen.
- **Pick up anything:**

| Item | Use |
|---|---|
| trash can | swing it, throw it, or stand on it |
| crate | throw it; it breaks into coins sometimes |
| bamboo pole | long reach |
| squeegee | wipes a whole lane |
| tire | rolls along the ground |
| chilli pot | burning splash |
| honey jar | slows whoever it hits |
| boxing glove | a punch-up for 10 s |
| rock | throw it |

**Defeat shouts** (our own, one per enemy type):

| Enemy | Shout |
|---|---|
| Salt Crew | "SPLASH!" |
| Pepper Crew | "TOO HOT!" |
| Dusters | "POOF!" |
| Hacked bots | "R-REBOOTING…" |

Each beaten enemy drops **Meru coins**.

**Growing stronger** (the River City heart):
- **8 stats:**

| Stat | What it does |
|---|---|
| PUNCH | punch damage |
| KICK | kick damage |
| WEAPON | damage with things you pick up |
| THROW | throw damage and distance |
| AGILITY | speed and jump |
| DEFENSE | damage taken |
| GRIT | knockdowns resisted |
| STAMINA | max health |

- **Food shops** (burgers, noodles, bakery, juice bar): eat to heal. **The first time you eat each dish, it raises a stat for good.** A menu of ~30 dishes to collect. Meru already has a burger restaurant: `worlds/meru-burgers.js`.
- **The scroll shop + dojos:** buy or win move scrolls. There are shared moves anyone can learn (our own names: STOMP, FOX DASH, BIG SWING, SPIN THROW, COUNTER, WALL JUMP), plus each Moon Master's own scroll.
- **Clothes shop:** each character's 3 colour sets (from the Fighter Workshop) and fun hats.
- **No levels to grind.** Stats come only from food, scrolls and training. Just like River City.

**The open city.** Districts link at their edges, and you can walk back anywhere. The map shows where you are and which districts are cleared. Enemies come back to cleared streets, but fewer of them, so there are always coins to earn. Shops are safe.

**Players**
- **Phone:** 1 player, switch characters at any shop.
- **Computer:** **2 players together** with game controllers. Reuse the Fox Fighters controller code: in `minigames/kyoto/sword-duel.js` search `s120` to `s125` (`pollPads`, `padDir`, `padInfo`, `padTeach`). The CONTROLLER SETUP screen is in Kyoto Sword Duel.dc.html. It already handles Xbox, PlayStation and cheap USB pads.
  - Map: X = PUNCH, A = JUMP, B = KICK, Y = SPECIAL, RB = CALL A FRIEND, START = pause / map.
  - Friendly fire: off by default, on as an option (it's funnier on).
- **Online co-op last** (Fox Fighters' online code links 2 phones: engine/duel-net.js + vendor/trystero-nostr.js).
- **Saving:** auto-save on the device. Plus a **code** you can write down and type on another device, a nod to the old password saves.
- **Phone controls:** a d-pad on the left with up/down for lanes; PUNCH, KICK, JUMP and SPECIAL on the right; a CALL button. Portrait puts the street on top and controls below; landscape puts controls at the sides.

## THE CITY · districts (first map)

| District | Who's there | Shops / extras |
|---|---|---|
| **PEARL SAIL PLAZA** (start) | quiet: the tutorial street | burger stand, clothes shop, the map |
| MERU STREETS | Salt Crew + Pepper Crew scouts | noodle bar, juice bar |
| SALT BUILDING DOCKS | **Salt Crew → BARNACLE** | the crate warehouse (lots of crates to throw) |
| PEPPER MARKET | **Pepper Crew → JALAPEÑO JACK** | bakery, the chilli stall |
| NEON ROW | mixed gangs at night | the arcade (a mini-game), the scroll shop |
| MERU LANES | gang bowling night | a bowling mini-game (`worlds/meru-lanes.js` exists) |
| LUXOR RING | street-boxing tournament → **LOX** | win the belt |
| KYOTO DOJO | **OYAKATA THE SUMO** | learn throws; training to raise stats |
| MERU LAKE & FALLS | Dusters on the docks | fishing for coins (a mini-game) |
| RUINS CAVE | **Dusters → ROOK** | hidden scrolls |
| CRYSTAL CAVES | crystal golems → **CRYSTAL WARDEN** | glowing shortcut |
| LAVA CAVE | fire beetles → **SLAGBACK** | |
| MERU ARENA | hacked guard-bots → **IRON WARDEN** (free him) | |
| THE FACTORY | hacked worker-bots → **MAKER PRIME** (free him) | conveyor-belt fights |
| CASTLE PATH | **KING MIGHT** and **PRINCESS MICHELLE** test you | the royal bakery (best food in Meru) |
| MOON GATE | a portal plaza: **the 8 Moon Masters** spar with you one at a time | each teaches their scroll and joins |
| **PEARL SAIL ROOFTOP** (finale) | **SUDS-9** (free him), then whoever is behind the hack | |

The main project's Meru city is in the source (`worlds/meru2-city.js`, `worlds/meru.js`, `meru-town-map.png`). Use it as reference for how the districts look and connect.

## BUILD ORDER (one step per message, show Ben each step)
1. **Prototype:** one street (Pearl Sail Plaza → Meru Streets), Ben, 2 lanes, punch combo, kick, jump, flying kick, grab + throw, 3 Salt Crew grunts that drop coins, a trash can to pick up and throw, defeat shouts. Phone controls tested at 390 × 844 and 844 × 390.
2. Health / SPIRIT bars, Ben's specials and super, enemy variety (3 gangs), the first boss: **BARNACLE** at the docks, who joins after.
3. Coins, the burger stand and noodle bar (food heals + permanent stat ups), the 8 stats screen, auto-save.
4. The open city map: 5 linked districts, walk back and forth, enemies return to cleared streets, the clothes and scroll shops.
5. Hope and Noble playable, switching at shops, call-a-friend, the audio guide pass.
6. 2 players together with game controllers on a computer.
7. The rest of the city, the bosses, the robots (freed, never destroyed), the Moon Gate, the finale (story ending is Ben's call). Online co-op last.

## HOW THE CHARACTERS ARE BUILT (reuse, don't rebuild)
The 23 bodies come from **`minigames/kyoto/duel-foxes.js`** in the Fox Fighters source.
- `foxFighter()` builds the foxes, with a foxKit from fox-kit.js. Ben, Hope and Noble come from engine/cast.js; the bosses use `def.boss` with engine/bosses.js.
- `rigFighter()` builds:
  - the robots (rig warden / prime / suds)
  - Slagback and the Crystal Warden (rig slag / crystal, made with engine/creature-kit.js)
  - **the 8 moon leaders** (rig `leader`, `def.leader = id`, `def.sc` = scale). These use **`minigames/kyoto/duel-moon.js`**, which runs the main project's newer rig `fox-kit-moon.js` + engine/species-leaders.js + the species kits and armour. **Call `initMoon(stage)` once first.**
- **The Fox Fighters fight engine is most of a brawler already.** In `minigames/kyoto/sword-duel.js` you'll find:
  - poses, attacks, hit-stop, knockdowns, throws (`foxThrow`), the specials (`SIG`) and supers (`SUPER`)
  - the CPU fighters (`ai` styles)
  - comic hit words ("WHACK!"), the stage backdrops, the voice lines
  The big change is **many enemies at once on a 2D street with lanes** instead of a 1-on-1 duel. Reuse the moves and bodies, and write a new world / camera / spawn layer.
- **Grunts (the gang members, the guard-bots)** are new, simple characters: fox and robot bodies from the same kits with gang outfits (Salt Crew overalls, Pepper Crew bandanas, Duster scarves). The bot bodies come from `worlds/pearl-bots.js`.
- For a lighter build, the Fighter Workshop has every character as a .gltf model (main + 2 colours).

## THE CAST · 23
Pow/Spd/HP are their Fox Fighters power / speed / health (1–5). characters.json turns them into **starting values for the 8 stats**, which then grow with food and scrolls. Moves are their Fox Fighters specials; Super is their Fox Fighters super. Everything here is a draft for Ben's OK.

| Character | Role | Where you meet them | Pow/Spd/HP | Moves | Super |
|---|---|---|---|---|---|
| **BEN** | STARTER | Pearl Sail Plaza | 3/3/3 | FOX BEAM · WHIRLWIND KICK · FOX FLURRY | FOX BEAM MAX |
| **HOPE** | STARTER | Pearl Sail Plaza | 3/5/3 | VAULT DIVE · CANE VAULT · CANE FLURRY | STARDUST VAULT |
| **NOBLE** | STARTER | Pearl Sail Plaza | 4/3/4 | SHOEMERANG · ROLLING CHAIR · THUNDER WHEELS | THUNDER CHAIR |
| **KING MIGHT** | SPARRING → JOINS | Castle Path: the King tests you | 5/3/4 | ROYAL CRUSHER · KNEE PRESS · ROYAL POUND | ROYAL DECREE |
| **MICHELLE** | SPARRING → JOINS | Castle Path: the Princess races you, then fights | 2/5/3 | PALM BLAST · SPINNING CRANE KICK · LIGHTNING KICKS | THOUSAND KICKS |
| **OYAKATA** | DOJO MASTER → JOINS | Kyoto Dojo: beat him to learn throws | 5/1/3 | SUMO TORPEDO · BELLY SPLASH · HUNDRED PALM | HUNDRED PALM ZENITH |
| **BARNACLE** | BOSS → JOINS | Salt Building Docks (Salt Crew gang boss) | 5/2/3 | CRATE TOSS · FORKLIFT SLAM · SALT FLURRY | FORKLIFT FINALE |
| **JALAPEÑO JACK** | BOSS → JOINS | Pepper Market (Pepper Crew gang boss) | 3/3/5 | PEPPER BOOM · CHILLI FLIP · JALAPEÑO JABS | PEPPER STORM |
| **ROOK** | BOSS → JOINS | Ruins Cave (Dusters gang boss) | 3/3/5 | SNIPER BEAM · DUSTER DASH · BANDIT BARRAGE | SNIPER OVERCHARGE |
| **LOX** | BOSS → JOINS | Luxor Ring: win the street-boxing tournament | 5/3/2 | DASH STRAIGHT · DASH UPPER · BODY BLOWS | KNOCKOUT RUSH |
| **IRON WARDEN** | FREE HIM → JOINS | Meru Arena: a hacked guard. Beat him and the hack breaks | 5/1/4 | ROCKET PUNCH · STOMP · PISTON PUNCHES | DOUBLE ROCKET |
| **MAKER PRIME** | FREE HIM → JOINS | The Factory: a hacked maker robot | 5/1/5 | LASER EYE · DRILL SPIN · CLAW FLURRY | LASER OVERLOAD |
| **SUDS-9** | FINAL BOSS → JOINS | Pearl Sail Rooftop: the hacked window-cleaner robot, last fight before the truth | 4/2/4 | RINSE CYCLE · SPIN CYCLE · SCRUB FLURRY | POWER WASH |
| **SLAGBACK** | BOSS → JOINS | Lava Cave: the beast calms down once beaten | 4/2/3 | LAVA LOB · MAGMA SLAM · MOLTEN FISTS | ERUPTION |
| **CRYSTAL WARDEN** | BOSS → JOINS | Crystal Caves: the guardian tests you | 4/2/4 | CRYSTAL SHARD · GEM CYCLONE · PRISM PUNCHES | PRISM STORM |
| **BRANNOCK** | MOON MASTER → JOINS | Moon Gate: spar to learn their scroll | 5/2/4 | HEARTH SLAM · LOG ROLL · BEAR PAWS | ELDER'S HEARTHFIRE |
| **OSSU** | MOON MASTER → JOINS | Moon Gate: spar to learn their scroll | 2/4/3 | STAR CHART · GRAV PULL · CRYSTAL TAPS | STARFALL |
| **IRISA** | MOON MASTER → JOINS | Moon Gate: spar to learn their scroll | 3/5/2 | LEAF STEP · TWIN SCYTHE · SCYTHE FLURRY | PRAYING STORM |
| **OSSA GREYCREST** | MOON MASTER → JOINS | Moon Gate: spar to learn their scroll | 3/4/3 | STORM DIVE · WING GUST · TALON FLURRY | THUNDERHEAD |
| **HOBART STEELBACK** | MOON MASTER → JOINS | Moon Gate: spar to learn their scroll | 5/2/4 | PISTON PUNCH · GROUND POUND · RAM RUSH | TURNTABLE THROW |
| **AMBRA** | MOON MASTER → JOINS | Moon Gate: spar to learn their scroll | 3/4/3 | STING RUSH · HONEY TRAP · BUZZ FLURRY | SWARM CALL |
| **ZAYD FARSIGHT** | MOON MASTER → JOINS | Moon Gate: spar to learn their scroll | 2/5/3 | JET DASH · SCARF WHIP · DUSTWING JABS | FAR SIGHT |
| **TOLLAN** | MOON MASTER → JOINS | Moon Gate: spar to learn their scroll | 5/1/5 | TAIL SWEEP · DEATH ROLL · GATOR SNAPS | SUNSTONE SURGE |

The 8 leaders have **no voice lines yet**. The other 15 have recorded voices in `audio/vo/` (manifest.json, 610 lines), including taunts and win lines for boss intros and team-ups.

## WHAT'S IN THIS ZIP
- `HANDOFF.md` (this file).
- `characters.json`: all 23 characters with builder, scale, colour, weapon, shot, role, where you meet them, starting stats, moves, super, Fox Fighters specials and voice folder.
- `FoxFighters/`: the complete current Fox Fighters source (build s125, with the controller code and the Meru world files). Read-only reference: copy what you need into the new game's folder.
- `pictures/`: the 8 leaders, the select screen, and the 8 leaders in a Fox Fighters fight.

## QUESTIONS FOR BEN (ask before step 2)
1. Is the name OK: MERU CITY RUMBLE or STREETS OF MERU?
2. The story: are the three bandit gangs right? **Who is behind the hack?**
3. Do beaten bosses joining as playable feel right?
4. Food that raises stats for good: which Meru foods should be on the menu?
5. 2 players on a computer to start: is that enough, or is phone-to-phone co-op important early?

## LIVE LINKS
- Fox Fighters: https://claude.ai/artifact/YERmv6QhfNk4wwg9vJUTEQ
- Fighter Workshop (all characters on a turntable, glTF downloads): https://claude.ai/artifact/J1FoKCXJ6818XdPcJAMPk8
- 8 Gates Workshops: https://claude.ai/artifact/SPmgFx3PnjTE23biQ8XsBA
