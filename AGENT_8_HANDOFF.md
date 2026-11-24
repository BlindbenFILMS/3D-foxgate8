# AGENT 8 · HAND-OFF (from the Fox Fighters thread, 18 Nov 2026)

Paste this whole file into the new thread first, then upload this zip. **Fox Fighters keeps its own thread.** This is a new, separate game that borrows the Fox Fighters cast.

## WHAT BEN WANTS
A **first-person spy game**: a fan tribute to the classic 1997 spy shooter, starring our avatars. Two halves, like the original:
- **Missions:** sneak into places, complete objectives, use gadgets, escape. Harder difficulties add more objectives.
- **Split-screen battles:** up to 4 friends on one screen, each picking a character.

Working name: **AGENT 8** (or FOXEYE). Ben may rename it.

**It is a tribute, not a copy.** Use no Bond / Rare / Nintendo names, film titles, characters, music, sounds, level layouts or menu art. Every mission, gadget, map and sound is our own 8 GATES material.

## THE TONE RULE (draft for Ben's OK, recommended)
**Nobody gets hurt for real.** This is the Fox Fighters cast, and Ben's work is for everyone:
- Lasers and darts **stun**. A stunned guard sits down dizzy with stars ("zzz") and is out of the fight.
- **Hacked robots reboot.** Hit the glowing hack chip and the robot sits down, its eyes turn blue and it waves. The robots are the **hacked Machine Fleet: victims, not villains**. Never destroyed.
- In battles you get **tagged out**, then respawn.
- No blood, no gore. Splats are paint, sparks and stars.

## BEN'S RULES (keep them)
- **Mobile first.** Test every screen at 390 × 844 and 844 × 390. Buttons are 44 px or bigger.
  - A first-person game plays best **sideways**: build landscape first.
  - Portrait gets a smaller view with the controls below it, and a "turn your phone" hint.
- Modernist design system: red on white / ink, square corners, flush-left labels, inline styles (no CSS classes).
- Back up a file before you change it (`backup/*.pre-sNNN.*`). Add an entry to BUILD_PLAN.md every session.
- **Lore is canon only when Ben says so.** The story below is a draft.
- **Do not edit the shared kit files in place** (engine/*-kit.js, species-armor.js, armor-sets.js, armor-crests.js, species-leaders.js, cast.js, fox-kit.js, fox-kit-moon.js). They are shared with the main 8 GATES project. If one must change, list it in `KIT_CHANGES.md`.
- **Accessibility matters to Ben** (Blind Canvas Project). A first-person game can be played by ear if it's planned from the start:
  - **3D sound for everything:** guard footsteps, robot hums, doors, the objective beacon. All panned and louder when near.
  - **Aim by sound:** a tone that rises as your aim gets close to a target, and locks with a click. Auto-aim does the rest.
  - **ECHO button** (Hope's echo): a ping that says what's around you ("door ahead, two guards left, stairs right").
  - Spoken objectives, with a **"which way?" button** that speaks the direction and distance to the next objective.
  - **CRYSTAL DARK**, a mission you play as Hope, is built to be played **entirely by sound**. Every player gets to feel how she moves through the world.
  Fox Fighters already has a spoken audio guide to learn from.

## THE STORY (draft for Ben's OK)
Someone is **hacking the Machine Fleet**. The same thread runs through Meru City Rumble, so the two games can share a world if Ben wants. **The Crown** (King Might) sends **Agent 8** (Ben) to find out who. **Noble** builds the gadgets. **Hope** is his ears on the radio. **Who is behind the hack is Ben's to decide.** Leave a placeholder for the final reveal.

## MISSIONS (8, one per 8 GATES place)
Each mission has 3 difficulties: **AGENT · SECRET AGENT · AGENT 8**. Harder difficulty means smarter guards, less armour and **more objectives**. Mission briefings come from the Crown, with Noble's gadget notes and Hope's radio tips.

| # | Mission | Objectives (AGENT → harder ones add more) | Build it from |
|---|---|---|---|
| 1 | **FALLS DAM** | Sneak across the dam, photograph the hacked pumps, then **glide off the waterfall** to escape (the big opening moment) | `worlds/meru-falls.js`, `worlds/meru-lake.js` |
| 2 | **THE FACTORY** | Find where the hack enters the robots, plant Noble's scanner, free Maker Prime | `worlds/pearl-bot-workshop.js`, `worlds/pearl-bots.js` |
| 3 | **SALT DOCKS** | Get into the Salt Crew hideout, read the shipping log, stun Barnacle | the Fox Fighters Salt Building backdrop |
| 4 | **PEARL SAIL TOWER** | Office floors: the security room download, free the hacked bots on each floor, don't trip the alarm (stealth bonus) | `worlds/pearl-floor3d.js` (the 3D office floor), `worlds/pearl-sail.js` |
| 5 | **RUINS CAVE** | The Dusters' base: find the map, stun Rook, escape before the cave lights go out | `worlds/meru-ruins.js`, `worlds/meru-caves.js` |
| 6 | **GONDOLA RUN** | With Michelle: fight car to car along the Pearl Sail gondola rails, uncouple the last car | new; the gondola from Fox Fighters' Pearl Sail roof |
| 7 | **CRYSTAL DARK** | **You are Hope.** The caves are pitch dark; find the way by sound, answer the Crystal Warden's riddle, guide Ben out | new; Hope's cane from `engine/hope-weapons.js` |
| 8 | **PEARL SAIL ROOFTOP** | Free SUDS-9, climb the antenna, stop the hack, face whoever is behind it (Ben's call) | the Fox Fighters roof stage |
| ★ | **MOON GATE** (bonus) | The 8 Moon leaders help you through their worlds, one power each | the moon leaders + species kits |

**After each mission:** a stats screen with time, accuracy, guards stunned, robots freed and stealth rating. **Beating a mission under a target time unlocks a FUN MODE.** That's the classic cheat-unlock loop, with our own modes:
- **BIG HEADS**
- **TINY FOXES**
- **PAINT MODE** (every shot splats paint)
- **SLOW MOTION**
- **ALL GADGETS**
- **INVINCIBLE**

## HOW IT PLAYS
**Missions**
- Walk, look, crouch, lean round corners. Doors, lifts, vents, switches.
- **Stealth:** guards patrol and hear loud shots. The silenced dart pistol is quiet, an alarm brings more guards, and a camera spots you if you stay in view.
- **Health + armour** (vests to pick up). Ammo pickups from stunned guards.
- **Auto-aim** on by default (it was the classic's secret), plus an **AIM** button to zoom and place shots precisely.
- **THE CREST WATCH** is the pause menu: objectives, the map, gadgets and options on Ben's wrist watch.

**Gadgets** (Noble builds them; `engine/noble-weapons.js` has his chair weapons to borrow from):

| Gadget | Use |
|---|---|
| CREST WATCH LASER | cuts locks and grates |
| MAGNET WATCH | pulls keys and keycards to you |
| CAMERA PEN | photographs objectives |
| SCANNER CHIP | plants on a robot or a computer |
| HONEY MINE | a sticky trap: whoever steps on it is stuck for 3 s (our proximity mine) |
| GLIDER SCARF | glide from heights (the dam escape) |
| ECHO PING | Hope's sonar (also the accessibility button) |

**Weapons** (all stun, all our own):

| Weapon | Use |
|---|---|
| DART PISTOL | quiet; the stealth choice |
| FOX LASER | Ben's sky-blue pistol |
| LASER CARBINE | rapid fire |
| STORM RIFLE | zoom scope; long range |
| SHOEMERANG LAUNCHER | Noble's: bounces off walls |
| HONEY MINES | stuck for 3 s |
| SPARK GRENADE | stuns a small area |
| **THE GOLDEN SHOEMERANG** | one-tag-out; the special battle weapon |

**Split-screen battles** (2 to 4 players)
- Pick any of the 23 characters. **All have the same body size for hits** (a nod to the classic's famous short-character problem: no unfair tiny characters).
- Optional **SIGNATURE WEAPONS** setting: everyone fights with their own Fox Fighters weapon and shot colour (table below).
- Modes (our own names):

| Mode | Rules |
|---|---|
| TAG OUT | most tag-outs wins |
| TWO LIVES | out after 2 tag-outs |
| ONE TAP | every hit tags out |
| HOLD THE CREST | keep the crest the longest |
| THE GOLDEN SHOEMERANG | one golden weapon on the map: whoever holds it tags out in one hit |
| TEAMS | 2 vs 2 |

- **Maps:** smaller arenas built from the mission places. Factory floor, office floor, Ruins cave, Castle library, Luxor Ring backstage, Crystal Caves (dark: radar only).
- Computer players to fill empty slots.

**Players and controls**
- **Phone (landscape):**
  - Left thumb: a move stick.
  - Right thumb: **drag to look**, with big FIRE and AIM buttons. Crouch, gadget and reload as small buttons.
  - **Tilt-to-aim (gyro)** as an option.
  - Auto-aim makes it very playable on a phone.
  - Phone = missions + battles against computer players.
- **Computer:** **split screen for up to 4 with game controllers**: left stick moves, right stick looks, RT fires, LT aims.
  - Reuse the Fox Fighters controller code: in `minigames/kyoto/sword-duel.js` search `s120` to `s125` (`pollPads`, `padDir`, `padInfo`, `padTeach`, the CONTROLLER SETUP screen in Kyoto Sword Duel.dc.html). It already handles Xbox, PlayStation and cheap USB pads.
  - **Note:** that code reads one stick for movement. This game also needs the **right stick for looking** (axes 2 / 3 on standard pads), so add a second stick reader to it.
- Keyboard + mouse on a computer too (pointer lock).
- Online battles last (Fox Fighters' online code links 2 phones: engine/duel-net.js + vendor/trystero-nostr.js).

## BUILD ORDER (one step per message, show Ben each step)
1. **Prototype:** first person in one Factory room. Includes:
   - phone controls (move stick, drag to look, FIRE, AIM, auto-aim), plus keyboard + mouse
   - the dart pistol
   - 3 hacked guard-bots that patrol, spot you and shoot back, then reboot when tagged
   - health + armour, one objective and an exit
   - tested at 844 × 390 (and 390 × 844)
2. More weapons, ammo, stealth (noise, alarms, cameras), the Crest Watch pause menu, gadgets: watch laser and camera pen.
3. **Mission 1: FALLS DAM** complete, with the 3 difficulties, the glide escape and the stats screen.
4. **Split-screen battles** for 2 to 4 on a computer with game controllers (right stick look), one map, TAG OUT, computer players.
5. The 23 characters as battle characters (first-person hands and their weapon, the full model for the others to see) and a two-page select screen (FOXES & BOSSES / MOON PEOPLES), as in Fox Fighters.
6. The audio guide pass (3D sound, aim tone, echo, "which way?") and CRYSTAL DARK.
7. The other missions, fun-mode unlocks, more maps and modes. Online last.

## HOW THE CHARACTERS ARE BUILT (reuse, don't rebuild)
The 23 bodies come from **`minigames/kyoto/duel-foxes.js`** in the Fox Fighters source.
- `foxFighter()` builds the foxes, with a foxKit from fox-kit.js. Ben, Hope and Noble come from engine/cast.js; the bosses use `def.boss` with engine/bosses.js.
- `rigFighter()` builds:
  - the robots (rig warden / prime / suds)
  - Slagback and the Crystal Warden (rig slag / crystal, made with engine/creature-kit.js)
  - **the 8 moon leaders** (rig `leader`, `def.leader = id`, `def.sc` = scale). These use **`minigames/kyoto/duel-moon.js`**, which runs the main project's newer rig `fox-kit-moon.js` + engine/species-leaders.js + the species kits and armour. **Call `initMoon(stage)` once first.**
- Every fighter has `upd(P, dt, f)`, which poses it from a pose object (hands / feet / hip / lean / twist / head yaw). Others in a battle need: run, aim, crouch, tagged-out (dizzy stars).
- **First-person view:** show only that character's hands and weapon. Build the weapons from the Fox Fighters ones: Ben's laser pistol, Noble's chair weapons, the leaders' `LEADER_GEAR` in duel-moon.js. Shot colours are in `LASER_COL` in sword-duel.js.
- **Guards:** gang members (Salt Crew overalls, Pepper Crew bandanas, Duster scarves) from the fox kits, and guard-bots from `worlds/pearl-bots.js`.
- **Levels:** the main project's 3D places are in the source (`worlds/*.js`). Reuse their layouts and materials and add first-person collision.
- For a lighter build, the Fighter Workshop has every character as a .gltf model (main + 2 colours).

## THE CAST · 23
Everything here is a draft for Ben's OK.

| Character | Story role | Signature weapon · shot (battles) |
|---|---|---|
| **BEN** | AGENT 8: you, in every mission | katana on his back · FOX laser pistol (sky blue) |
| **HOPE** | Your ears on the radio ("two guards behind that door"); you play her in CRYSTAL DARK, a mission played by sound | katana on her back + her long CANE (far hand) · laser pistol (near hand) |
| **NOBLE** | The gadget master: builds your gadgets in his chair workshop and briefs you on them | sword sheathed on the chair back (DRAW CUT, hits low) · SHOEMERANG boot |
| **KING MIGHT** | THE CROWN: gives you your missions in the Throne Room | katana · laser |
| **MICHELLE** | Field partner on the GONDOLA RUN mission | katana · laser |
| **OYAKATA** | Runs the Kyoto safehouse and the training range | katana · laser |
| **BARNACLE** | Mission boss: Salt Crew hideout at the docks (stunned, then arrested) | katana · laser |
| **JALAPEÑO JACK** | Mission boss: Pepper Crew warehouse | katana · laser |
| **ROOK** | Mission boss: the Dusters' cave base | katana · rifle-style laser (lime) |
| **LOX** | Informant at the Luxor Ring: win a bout and he trades you a clue | katana (same back fit as Ben) · laser |
| **IRON WARDEN** | Hacked guard robot: free him (stun the hack chip) | double-sided AXE on his back · eye laser + hip laser (orange) |
| **MAKER PRIME** | Hacked factory robot: free him, and he shows you where the hack comes in | DRILL ARM (thrust, pulses) · LASER EYE (red) |
| **SUDS-9** | Hacked window-cleaner robot on the tower: the last robot to free | SQUEEGEE spin · water burst / soap spray |
| **SLAGBACK** | Guardian of the Lava Cave: get past him, don't fight him | LAVA AXE · LAVA LOB: digs lava from his chest, fireball explodes |
| **CRYSTAL WARDEN** | Guardian of the Crystal Caves: answers Hope's riddle | crystal GREATSWORD · CHEST BLAST from his core (violet) |
| **BRANNOCK** | Ally on the MOON GATE mission: helps you with their power | black-iron RUNE STAFF · RUNE BOLT (green) |
| **OSSU** | Ally on the MOON GATE mission: helps you with their power | floating LOG-CRYSTAL · CRYSTAL BEAM (cyan) |
| **IRISA** | Ally on the MOON GATE mission: helps you with their power | SCYTHE ARM · LEAF BLADE (green) |
| **OSSA GREYCREST** | Ally on the MOON GATE mission: helps you with their power | white STORM STAFF · STORM BOLT (pale blue) |
| **HOBART STEELBACK** | Ally on the MOON GATE mission: helps you with their power | hydraulic KNUCKLE RAM · PISTON BLAST (yellow) |
| **AMBRA** | Ally on the MOON GATE mission: helps you with their power | STINGER SCEPTRE · STING DART (amber) |
| **ZAYD FARSIGHT** | Ally on the MOON GATE mission: helps you with their power | BRASS TELESCOPE · GLINT SHOT (teal) |
| **TOLLAN** | Ally on the MOON GATE mission: helps you with their power | carved SANDSTONE STAFF · SUN BOLT (teal) |

The 8 leaders have **no voice lines yet**. The other 15 have recorded voices in `audio/vo/` (manifest.json, 610 lines). Use them for radio chatter, briefings and battle taunts.

## WHAT'S IN THIS ZIP
- `HANDOFF.md` (this file).
- `characters.json`: all 23 characters with builder, scale, colour, weapon, shot, story role, signature weapon, Fox Fighters specials and voice folder.
- `FoxFighters/`: the complete current Fox Fighters source (build s125: the controller code, the Meru and Pearl Sail world files, Noble's and Hope's weapon files). Read-only reference: copy what you need into the new game's folder.
- `pictures/`: the 8 leaders, the select screen, and the 8 leaders in a Fox Fighters fight.

## QUESTIONS FOR BEN (ask before step 2)
1. Is the name OK: AGENT 8 or FOXEYE?
2. **The tone rule:** stun and reboot, nobody hurt. OK?
3. The story: the Crown sends Agent 8; Noble builds the gadgets; Hope on the radio. Right roles? **Who is behind the hack?**
4. Should it share its world and story with Meru City Rumble?
5. Which mission first after the prototype: FALLS DAM, as planned?

## LIVE LINKS
- Fox Fighters: https://claude.ai/artifact/YERmv6QhfNk4wwg9vJUTEQ
- Fighter Workshop (all characters on a turntable, glTF downloads): https://claude.ai/artifact/J1FoKCXJ6818XdPcJAMPk8
- 8 Gates Workshops: https://claude.ai/artifact/SPmgFx3PnjTE23biQ8XsBA
