# MERU 2.0 — the modern city rebuild

**NEW CHAT? Step 9 is done (passes 1–6, section 19). Next: Ben's real-iPhone test, then say what to build next.** Page: `Meru 2 Blockout.dc.html` (WALK IT). Modules in `worlds/meru2-*.js`: layout · blockout · city · train · walk · civic · law · rooms · rooms2 · apts · heights · paths · lake · yards · audio. Audio hooks for Ben: `AUDIO_HOOKS.md` + `MERU/audio/manifest.json`. Backups: `backup/meru2-step1/`, `backup/meru2-step2b/`, `backup/meru2-step3c/`, `backup/meru2-step4/`, `backup/meru2-step5/`, `backup/meru2-step7/`. Every price/fine is DRAFT until Ben sets it.

Ben's brief (session after the minigame import): rebuild Meru from the ground up as a modern city. Keep every bracketed room name, NPC and quest from surface_meru.html. No new dialogue text anywhere (Ben has a voiced dialogue system + script coming); new avatars get a role and an ID only, listed in section 6 so Ben can write their lines.

## 1. What the 35 minigames + recent maps taught us (apply to Meru 2.0)
- **Drop-in interiors.** Every good job exports `buildX(ctx)` (room only, colliders, spots, anim) + a stand-alone page with `?embed=1` that posts an exit message. Meru 2.0 builds rooms with the `build*` functions and opens jobs full-screen in the game panel. One pattern for all: diner, cinema, ball works, camel pen, comics, goldsmith, tank works, boatworks.
- **Shared save that syncs** (new engine/save.js: storage event + save.reload). Gold earned in a panel shows in the world at once.
- **Welcome card standard** (TUTORIAL · red PLAY · WATCH THE DEMO) + day card + phone preview page for every job.
- **Standard HUD vehicle keys** cover every mode: walk, shop (WAVE/LOOK/JUMP), camel, gold, skate, boat, tank, dive, swim. Meru 2.0 switches the HUD key per zone/vehicle instead of building new buttons.
- **Synth audio per location** (cinema, ball works, camel pen, comics all make music in code) with a per-room `music.mood()` and a mute key. Meru 2.0: each building/zone gets an audio "room"; the world crossfades at the door.
- **Phone budget tricks that worked:** merged static meshes per material (Ball Works ≈300 draws), `setVisible(false)` for rooms you are not in, walls that cut away when the camera is behind them (Comic Shop `applyCut`), far crowds hidden.
- **Readable paths:** lamps/lanterns every 7–12 m (Skate Park, Bike Park), glowing edge lines and arrows (Moto pass), edge arrows to the next goal.
- **Spaced creatures off-path** (Bike Park laser woods: enemies live off the trail, respawn timers) is the model for the longer Ruins Path.
- **Sizes:** Tavern/Burgers style fade interiors far from the map with a quick fade; real cutaways only when the outside building is big enough.

## 2. Spatial sound rules → **SOUND_LAYOUT_RULES.md** (measured by Ben's sound chat; these win)
Short form: talkers/greeters ≥ 16 m apart outdoors (20 preferred), ≥ 12 m indoors · doors on one street face ≥ 22 m apart (or on different faces) · rooms ≤ 12 m or ≥ 20 m · zones ≥ 30 m deep, boundaries at gates/bridges/turns · ≥ 3 surface changes per route · tiers: talker / greeter / crowd · one room table + paved map + floor per room. The layout data (worlds/meru2-layout.js) is checked against this automatically on `Meru 2 Layout.dc.html`.

## 2b. Ben's decisions (locked, do not re-ask)
- **Replace** Meru Town Square (back it up to backup/meru-v1/ first). Map ~**900 × 900 m**.
- **Modern city:** glass + steel towers on the skyline · streets with moving cars + the train · neon signs at night · parks, trees, fountains in the plaza · bridges / raised walkways · keep some old stone (Meru history). **Polish the look over several chats: beautiful lighting and light fixtures** (street lamps, shop glow, neon, window light at night, light-up door frames).
- **Traffic:** cars only on roads, never on foot paths.
- **Getting around:** walkable TRAIN · rental car · taxi (tap a stop on the map) · fast travel only to places you've visited.
- **THE TRAIN:** a walkable train with several cars, runs on a schedule. Buy a ticket for a DAY, WEEK or MONTH (prices: Ben sets later). First trip to a stop = you ride it: sit, look out the window or walk the cars while it travels. A stop you've been to = fast travel. **6 stops:** Town Square · Castle/Barracks · Lake · Arena · Skate Park/Ruins · Pearl ferry dock.
- **Car:** rent one at the CAR RENTAL store (Lanes Court, door north, 10 × 8 m, rental clerk). **Rental lot right beside it** (6 bays, off the ring road): the rented car waits there and is returned there.
- **POLICE DEPARTMENT** with a couple of jail cells. Fines: riding the train without a ticket, driving on foot paths. Arrest: hitting townsfolk, stealing from shops. Jail = wait out the time or pay bail; or escape: the Meru lock-pick minigame on the cell, then sneak past one guard. Unpaid fines come out of the BANK.
- **BANK / storage:** store gold so you keep it when you lose · item storage locker · interest each in-game day · a vault you can see (no robbery).
- **Pearl Island:** reach it by speedboat, by swimming, or by the ferry from the dock. Pearl diving = 3D dive built from the Jidda Deep Dive engine, reskinned for Meru (Nelly, pearls), in the very deep valley pond.
- **TANK RANGE → PLANET DEFENSE (Ben, added):** the Tank Range minigame (minigames/meru/tank-range.js, Sgt. Tread) sits by the Barracks next to Tank Works and is the way to the Planet Defense Base. Draft rule until Ben confirms: passing the range (flag `meruTankRange` done) opens the defense road gate, and the tank can be driven up the road to the base.
- **NOW HIRING signs (Ben):** every building with a job gets a NOW HIRING sign by its door (outside, readable from the street, lit at night). The sign is a hotspot: walk up to it (prompt "Now hiring · PLAY") or tap it and the job's minigame opens full-screen in the panel, the same page the keeper's "Put me to work" opens. Jobs: Burgers (Sizzle), Tank Works (Sgt. Tread), Boatworks (Jon), Blind School (Hope's class), Bowling? (if Mott has a job), Skate Park (Tony), Speedboat Bay, Tank Range, plus any shop job added later. Data: `hiring: { game, url }` on the building in worlds/meru2-layout.js.
- **Jobs on the map:** walk into the real building; the job opens full-screen in the panel (Skate Park, Tank Works, Boatworks, Blind School, Speedboat Bay, Burgers).
- **Buildings:** cutaway everywhere (walk in through the glass door, the roof and near walls fade out, same scene); phones fall back to the quick fade if it gets slow. Smooth in/out transitions are a priority.
- **Doors (Town Square):** wide + tall automatic sliding glass doors you can see through, light-up frame all one colour (GOLD), a shop sign over every door, a chime when they open.
- **Apartments:** every room ×2 width and ×2 depth.
- **Ruins Path:** longer, Meru's existing creatures from the creature library live off the path. **Ruins cave entrance:** a real cave mouth with ruins around it.
- **Cast:** the player starts ALONE. HOPE is in the School for the Blind teaching a class. NOBLE is in the TAVERN. They stay in their places; you can swap to them only after they join.
- **Spatial sound:** SOUND_LAYOUT_RULES.md (section 2). Ben is sending dialogue notes next; keep layout loose on anything they might change.
- **No new dialogue text.** New avatars go in section 6 (ID, place, role, look) for Ben to write.

## 3. Map (proposal; final layout in step 1)
```
                 CASTLE PATH (N) ── Castle / barracks ── TANK WORKS (by the barracks)
                          │
 RUINS PATH (long, W) ── SKATE PARK ── TOWN SQUARE (modern city centre) ── ARENA PATH (×2 long, ×2 wide, E) ── ARENA
   creatures off-path                     │
                                   LAKE PATH (long, nature)
                                          │
                       BIG SWIMMABLE LAKE: JON'S BOATWORKS (speedboat repair) · SCHOOL FOR THE BLIND (lakeside)
                       · SPEEDBOAT BAY course · the speedboat replaces the old boat · ferry/boat out to:
                                          │
                       PEARL ISLAND: beach all round, hills, a valley with a VERY DEEP pond = pearl diving
```
- Town Square becomes the city centre: wide plazas, avenues, glass + steel shopfronts, street furniture, lit crossings. Every existing building keeps its room and keeper.
- **Doors (all Town Square buildings):** 4 m wide × 4.5 m tall automatic sliding glass doors you can see through, opening as the player nears (2.5 m sensor), in a tall light-up frame in a colour that contrasts with the facade (per building).
- **Apartments:** every room twice as large (both directions ×1.41 or as Ben prefers).
- **Free to redesign:** bowling alley, casino and any interior.

## 4. Kept from today (must not be lost)
All rooms with bracketed names, all NPCs and lines (verbatim, voiced later), quests and story flags, shops and prices, Arena, Space Dock link, Bridge (ON HOLD, untouched), jukebox, darts, casino games, Burgers job, Nelly / pearls story.

## 5. Build order (one chat per step, rooms first, then polish)
1. Map layout + scale (900 m) + roads, foot paths, train line + 6 stations, zone labels + base lighting + phone budget/streaming (no interiors yet). Back up the old Meru first.
2. Town Square city centre + the new door system (gold sliding glass doors, chime, cutaway) + all Town Square buildings outside + Police Dept, Bank, car rental, train station outsides.
2b. The walkable train (cars, schedule, tickets, sit/window view, fast travel) + taxi + rental car.
2c. Police + jail (fines, arrest, bail, lock-pick escape) + Bank (deposit, locker, interest, vault).
3. Interiors: casino (new layout with sound bays), bowling, tavern, shops, apartments ×2.
4. Arena Path / Castle Path / Lake Path / Ruins Path (creatures) with speaker spacing.
5. Lake: swimmable water, speedboat replaces the boat, Jon's Boatworks, School for the Blind, Speedboat Bay course start.
6. Pearl Island + deep pond diving.
7. Skate Park + Tank Works on the map.
8. Spatial audio hooks for Ben's voice script + his sound design brief.
9. Look-and-feel polish passes over several chats: lighting, light fixtures, neon, night city, then the phone polish pass + "try this" list.

## 6. New avatars (roles only, no lines — Ben writes them)
Source of truth: `NEW_AVATARS` in worlds/meru2-layout.js (also listed on Meru 2 Layout.dc.html). Current draft (key · where · tier):
- arenaStall2 · Arena Path clearing 2 stallholder · greeter
- arenaStall3 · Arena Path clearing 3 stallholder · greeter
- arenaGate · Arena gate · greeter
- ferryCaptain · Pearl Ferry Dock · talker
- pearlLocal1 · Pearl Island beach · talker
- pearlLocal2 · Pearl Island hills · greeter
- pearlDiver · deep pond edge, starts the dive · talker (also on the raft inside the dive)
- ferryCrew · on the ferry · crowd
- casinoPoker1, casinoPoker2 · casino poker bay dealers · greeter
- casinoWheel · casino wheel bay · greeter
- casinoCashier · casino cage · greeter
- policeDesk · Police front desk · talker
- jailGuard · jail · greeter
- bankTeller · Bank counter · talker
- bankVault · Bank vault door · greeter
- rentalClerk · Car Rental · talker
- ticketClerk · Town Square Station · talker
- trainConductor · on the train · talker
- Hope's pupils (School for the Blind classroom, names + looks from the school game KIDS): juno JUNO · pip PIP · tobi TOBI · mae MAE · rio RIO · crowd tier until Ben writes their lines
Still to add when built: taxi drivers, officers on patrol, more Arena/Lake Path townsfolk (most of them crowd tier, no voice).

## 7. Step 1 status
- DONE (draft): worlds/meru2-layout.js (zones, ground map, lake + Pearl Island + deep pond, roads, foot paths, train loop + 6 stations, 30 buildings with doors + room table, speakers with tiers/keys) + `Meru 2 Layout.dc.html` (top-down plan with layer toggles, the 9-point sound checklist run live: all pass, new-avatar list).
- WAITING: Ben's dialogue notes (may move speakers marked draft), Ben's OK on the plan, Tank Range → Planet Defense rule.
- STEP 1B BLOCKOUT DONE: worlds/meru2-blockout.js + `Meru 2 Blockout.dc.html`: the whole 900 m map in 3D from the layout data (one painted ground texture with surfaces/roads/paths/rental lot, lake + Pearl Island lathe with hills, valley and the 22 m-deep pond, every building as a block with a gold-framed glass door + NOW HIRING signs, cave mouth with rocks + broken columns, instanced glass-tower skyline kept off roads/paths/buildings, elevated train track with pillars + a moving 4-car train, 238 instanced path lamps that glow at night, speakers with 7 m voice rings, zone labels). Orbit/pan/pinch camera, fly-to zone bar, NIGHT / VOICE RINGS / ZONE NAMES / SKYLINE toggles.
- STEP 1C DONE (first pass): worlds/meru2-walk.js + WALK IT button on `Meru 2 Blockout.dc.html`. Player from engine/cast.js on the 900 m ground with the standard Game HUD (contract implemented: setStick, jump, talk, lookBy, zoomBy, mapData…), 4 m/s walk (Ben's sound number), jump, swimming in the lake + the pond, island hills, building collision, zone label + music key per zone (shown on screen; real crossfade in the audio pass), synth footstep per surface (stone/wood/rug/sand/grit/grass/water: placeholders until Ben's sound pass), the ONE-greeting-at-a-time 7 m voice trigger test (red VOICE chip shows which key would speak), the NOW HIRING hotspot (green PLAY button / E opens the job page full-screen, BACK TO MERU closes), door chime on approach. Stable camera follow distance (sound note 4). FLY VIEW returns to the orbit view.
- NEXT: phone check at 390x844 / 844x390 on a real iPhone, then step 2 (Town Square city centre + gold sliding glass doors + cutaway interiors).

## 8. Step 2 status (Town Square city centre)
- DONE (first pass): worlds/meru2-city.js, built by the blockout (backup of step 1 in backup/meru2-step1/). 13 Town Square buildings as real shells (Tavern, Casino, Meru Lanes, Item Shop, Armory, Fortune Teller, Burgers, Police, Bank, Car Rental, Crestview House, Lakeside Tower, Town Square Station) with facade textures whose windows light up at night; old stone kept on Tavern (hip roof), Fortune Teller (dome), Bank (columns + entablature). Neon edges on Casino + Lanes, police light bar (blinks at night), bowling pin on the Lanes roof, crowned glass towers, red station canopy.
- DOORS: 14 doors, 4 × 4.5 m two-leaf sliding glass doors that pocket into the wall, 2.5 m sensor, chime on open, GOLD light-up frame, a sign over every door, entry mat, light pool at night, NOW HIRING sign by Burgers. Closed doors block; open doors let you walk in.
- CUTAWAY: inside a building (or when the camera ends up inside one), the roof/upper storeys and the walls between camera and player fade out (0.25 s). Footsteps switch to the room floor. HUD label shows "<building> · inside". Interiors are empty floors until step 3.
- PLAZA: fountain with animated jets (collider), ~140 trees (80 on phones), benches, 266 city lamps with glow + ground light pools at night, crosswalks where the four foot paths cross the ring road, 12 cars on the ring road (8 on phones, two lanes, right-hand traffic, stop for the car ahead and for the player), 3 parked cars in the rental lot.
- LAYOUT CHANGES: Lakeside Tower moved 10 m south (it sat on the ring road); its door greeter moved with it. Town Square Station got a second (south) door so the Lake Path runs through the hall.
- NIGHT button + T key in walk mode.
- Tavern moved east of the Castle Path (f 12..52, door (32, -60) south face) so the path runs straight north (Ben's call).
- OPEN: phone check of the cutaway speed (quick-fade fallback if slow).
- NEXT: step 2b (walkable train, taxi, rental car).

## 9. Step 2b status (train + taxi; rental car still to do)
- DONE: worlds/meru2-train.js. New loop in worlds/meru2-layout.js TRAIN.line (clockwise, straight runs through every platform): Town Square (over the ring road's centre median) · Pearl Dock · Arena · Castle · Skate/Ruins · Lake. Old line replaced (it ran through the Crestview tower and had no room for platforms).
- 4 walkable cars on a schedule: 22 s at each stop, doors open on the platform side, up to 18 m/s between stops (~6 min loop). Walk the cars through the gangways, 14 seats per car: SIT DOWN = window view (drag to look), stand by moving or E. Roof + camera-side wall cut away while you walk inside.
- Each station: 64 m platform on the station side (yellow edge, railings, red canopy, name boards), a glass LIFT from the street (stand on the gold pad, it rises in ~3 s, call it from either level), TICKET machine at its foot.
- TICKETS (machine, E): DAY 10 / WEEK 50 / MONTH 150 gold. DRAFT prices in TRAIN.prices until Ben sets them. Ticket stored in the save (stat meru2Ticket {kind, until}); day counter = stat meru2Day (stays 1 until the day/night clock is built). Boarding without a ticket logs stat meru2FareDodge for the Police step (2c).
- FAST TRAVEL: from the ticket machine, to stops you have ridden to or stood on (flags meru2Stop_<key>), needs a ticket. TAXI button (outdoors): tap a stop on the map or in the list, fare = 2 + 1 gold per 80 m (DRAFT, TAXI in layout), drops you at the station door.
- LAYOUT CHANGE: Lakeside Tower moved inside the ring road (100..140 x 100..140, door W), its greeter moved with it.
- RENTAL CAR DONE: desk inside Car Rental (E · RENT A CAR) → RENT FOR A DAY, 25 gold DRAFT (CAR_RENTAL in layout). The car waits in bay 1 of the lot. Walk up, E = DRIVE. Standard vehicle controls (stick/WASD: up = throttle, down = brake/reverse, left/right = steer; same arcade numbers as vehicle-lab.js, max 16 m/s). Game HUD vehicle="car" (new VEH_SHORT/VEH_WEAPONS/IC entries in Game HUD: 1 HORN · 2 LIGHTS (headlight pools) · 3 BRAKE hold). E when slow = GET OUT; get out inside the lot = RETURN CAR (rental ends). Left elsewhere, the car stays there (save stat meru2RentalCar). Rental = stat meru2Rental {until}. Can't drive into buildings, water, trees, lamps, pillars. Driving onto a foot path logs stat meru2PathDrive for the Police (2c). Backup: backup/meru2-step2b/.
- NEXT: step 2c (Police + jail, Bank).

## 10. Step 2c status (Police + jail, Bank)
- DONE: worlds/meru2-law.js (fines, bank, locker, jail, new-day rules on the shared save) + worlds/meru2-civic.js (the rooms) + panels on Meru 2 Blockout.dc.html.
- POLICE (inside the Police shell): front desk with policeDesk (E · POLICE DESK · FINES → list of fines + PAY FINES: gold first, then the bank). Jail hall behind a wall with an open gate; two cells with bars and a bunk; jailGuard walks the hall, stops at each end and looks round, with a red VIEW CONE on the floor.
- FINES (DRAFT gold): train without a ticket 20 · foot-path driving 15 · hitting townsfolk 50 · stealing 40 · jail break 30 (LAW in meru2-law.js). Train + path fines are live; hitting/stealing arrest via walker.arrest('assault'|'theft') once those systems exist. TEST ARREST button in walk mode until then.
- JAIL: 90 s sentence (DRAFT, real seconds until the clock exists; saved, so a reload puts you back in the cell). WAIT it out · PAY BAIL 60 (gold, then bank) · or walk to the cell door, E · PICK THE LOCK = the Meru lock-pick (3 pins, same speeds, green zone and lines as surface_meru.html) → the cell opens → sneak past the guard to the lobby. Seen in the cone = back in the cell +30 s. Getting out adds the jail-break fine.
- BANK: teller counter with bankTeller (E · BANK TELLER → deposit / withdraw 10 · 50 · ALL, ledger), STORAGE LOCKER wall (item by item, bag ↔ locker), the VAULT behind a glass wall (open round door, gold bars), bankVault greeter by it.
- NEW DAY = turning NIGHT → DAY (T or the button): day +1, 2% interest on the bank (DRAFT), unpaid fines come out of the bank. Tickets and the car rental expire by day.
- "Gold in the bank is kept when you lose": stored in stat meru2Bank, ready for the defeat rule (not built yet).
- TRY THIS: TEST ARREST → wait, or pick the lock and time the guard's turn · get caught once · pay bail instead · ride the train with no ticket, then pay at the desk · deposit gold, press T twice (night, day) and see interest · put the chocolates in the locker.
- NEXT: step 3 (interiors: casino, bowling, tavern, shops, apartments ×2).

## 11. Step 3 status (interiors)
- PART 1 DONE: worlds/meru2-rooms.js.
  - TAVERN [meruTavern]: bar along the north wall (bottle shelves, 9 stools), stone fireplace with a flickering fire (west), 6 tables with chairs and pendant lamps, DARTS board (east wall, E · PLAY · DARTS → minigames/meru/darts.html), JUKEBOX (north-east, → jukebox.html). NOBLE (cast.js, chair) at his table, DOC BRAUN by the bar side.
  - CASINO [meruCasino]: three SOUND BAYS split by glass partitions with gold rails: SLOTS bay on the west wall (6 machines: SLOTS / TRIPLE SLOTS / FOX SLOTS → slot1 / slot3 / slotFox.html), POKER bay north (FIVE CARD POKER → poker5.html, TEXAS HOLD'EM → pokerTexas.html, a dealer at each), WHEEL bay south (big spinning wheel → wheel.html, casinoWheel host), CASHIER cage south-west (gold bars, casinoCashier). Pink neon trim round the hall. Casino speakers moved in the layout to their tables (indoor spacing rule still passes).
  - Games open full-screen in the panel; BACK TO MERU closes it. The camera pulls in to 6.5 m indoors.
- PART 2 DONE: worlds/meru2-rooms2.js.
  - BURGERS [meruBurgers]: diner counter + red stools, grill + hood, two red booths, checker floor, neon over the kitchen. burgerCook at the grill, Michael Jay in a booth. E at the counter · PUT ME TO WORK = the BURGERS JOB (Meru Burgers.dc.html, the same page as the NOW HIRING sign outside).
  - MERU LANES [meruBowling]: 6 lanes with pins, foul lines, ball returns, cyan neon over the pin deck, shoe counter + shoe wall, benches. All 5 Lanes people (spacing rule: lanesRival + bowlerDash moved in the layout). E at the approach · PLAY · TENPIN (minigames/meru/tenpin.html).
  - ITEM SHOP (Kia) + ARMORY (Bram): counter, stocked shelves (Bram: sword rack). E · BUY → stock + prices verbatim from worlds/meru-shops.js STOCK; items go to the bag, gear sets its flag.
  - FORTUNE TELLER (Ora): drapes, table, glowing crystal ball. (Her reading comes with Ben's dialogue system.)
- PART 3 DONE: worlds/meru2-apts.js. CRESTVIEW HOUSE (stone, wood floors) + LAKESIDE TOWER (glass, grey floors). LOBBY: realtor at a desk (aptRealCrest / aptRealLake), sofas, rug, ELEVATOR at the back (E → Lobby / Floor 1 / Floor 2, quick fade). FLOORS 1 + 2 at their real heights inside the tower (7.2 m, 10.8 m), only the floor you are on is drawn: a hall from the elevator, rooms A B C D (10 × 11 m, ≈2× the old 6 × 5.5) + E (12 × 12) across from the elevator at the hall's end; numbered doors 101-105 / 201-205, each room has a bed, sofa and a MERU NEWS 8 TV. PENTHOUSE = 204: rent at the realtor (PENTHOUSE · 10 CR A NIGHT, flag stat meru2Pent), its door is closed until you rent; its bed = SLEEP TILL MORNING (new day: interest, fines, tickets).
- PART 4 DONE: worlds/meru2-heights.js (data: HILLS / TRAILS / LIGHTHOUSES in worlds/meru2-layout.js; backup before it: backup/meru2-step3c/).
  - MERU FALLS [meruFalls] (west of the lake, 22 m): plateau with a spring pool, stream across the top, sheer cliff on the lake side, waterfall (animated) into a plunge pool, stream on to the lake, OVERLOOK DECK cantilevered off the cliff beside the falls. Lantern trail up from the shore.
  - CASTLE RIDGE [meruRidge] (26 m, north-west of the Barracks): lantern trail from the parade ground to a raised LOOKOUT deck with a Meru flag.
  - RUINS HILLS [meruRuinsHills / meruRuinsHillsS] (16 m north, 13 m south of the Ruins Path): wild, no trail, rocks + pines. 8 creature spots ready (heights.wild) for step 4.
  - HILL PARK [meruHillPark] (18 m, east of Civic Row outside the ring road): lantern trail from Lanes Court, paved summit with a railing, benches and lamps facing the skyline.
  - PEARL ISLAND hills raised from 13 m to 19 m (one profile now: ISLAND.prof / islandH in the layout).
  - LIGHTHOUSES: FERRY LIGHTHOUSE at the end of a new 64 m pier off the Pearl Ferry Dock (lanterns, rails), PEARL LIGHTHOUSE on the island's south-east beach. Red/white 20 m towers, spiral stair outside (push toward the tower = climb, away = go down; the camera swings outside), gallery with a rail, lamp room; at night a rotating beam + glow. The tower fades when you are on the stair.
  - Rules: steep slopes (> ~53°) can't be climbed (the falls cliff), decks have rails on their closed sides, cars can't drive up hills / onto decks, trees and rocks block, the camera stays above the ground, footsteps grit on trails / wood on decks / stone on the summit + stairs, TAXI works on hills.
  - OPEN: phone check at 390x844 / 844x390 (terrain is 2.5 m grid + half the trees on phones).
  - TRY THIS: walk the pier to the Ferry Lighthouse and climb to the gallery · do it at night for the beam · walk up the lantern trail to the Falls overlook, then look at the waterfall from the plunge pool · climb Castle Ridge to the lookout · Hill Park at night for the skyline · try to climb the falls cliff from below (you can't) · walk the Ruins Hills off-path.
## 12. Step 4 status (the four paths + Ruins wilds)
- DONE (first pass): worlds/meru2-paths.js. buildPaths (in the blockout, so the fly view shows it too) replaces the generic path lamps inside the four path zones with each path's own fixtures:
  - CASTLE PATH [meruCastlePath]: low stone walls both sides with a gap every 40 m (off-path freedom), flame braziers on plinths every 14 m, red Meru banners that sway, the MERU CASTLE gate (two towers + lintel) at z -318 = the zone boundary, trees behind the walls.
  - ARENA PATH [meruArenaPath]: orange-trimmed road + orange frames round the 3 clearings, gravel road between them (new grit surfaces), torches every 10 m, 7 striped stalls + Odo's ODDS board, bunting over each clearing, the MERU ARENA gate at x 360.
  - LAKE PATH [meruLakePath]: hedges with gaps, flower beds, warm lantern posts every 12 m, timber THE LAKE arch at z 212, a wooden boardwalk over the shore sand (wood surface, z 214-238).
  - RUINS PATH [meruRuinsPath]: purple trim, violet lantern pillars every 12 m, ~20 broken / fallen columns, ruined wall fragments, two old arches across the road (x -300 whole, x -360 broken).
  - All lights glow at night; flames flicker. Everything has colliders.
- PEOPLE: buildPathLife (in the walk) stands every outdoor speaker on these paths up as a real fox (looks from the old modules: meru.js, meru-castlepath.js, meru-arenapath.js, meru-ruins.js), facing the path, turning to you within 6 m, culled past 95 m (60 on phones). Their blockout cylinders hide. Speakers with no old look (defGuard, new avatars, Tony, lake/island folk) still show as cylinders until their step.
- LAYOUT: the old Arena Path crowd added to SPEAKERS (torv, odo, tam, rosk, marla, pell, sela, wren, ivy, hetty, arenaGuard1/2, arenaRoadGuard1/2, vance), stall rows at z -24 / +26, mid-road at -10 / +12. The 9-point sound checklist still passes. NOTE for Ben: arenaStall2 / arenaStall3 / arenaGate (new avatars from step 1) now stand beside the old crowd; cut them if the old names cover those roles.
- RUINS WILDS (WILD in the layout): Meru's own creatures, the cave BATS + RATS (worlds/meru-caves.js makeCritter), 12 spots off the path + the 8 Ruins Hills spots (half on phones). They never come within 9 m of a foot path, stay within 26 m of home, give up if you stay on the path 2.5 s, walk home, respawn 40 s after a kill when you are 35 m away. Only the one you hit wakes up (engine/combat.js got a `solo` flag; the Meru cave bandits still wake together).
- COMBAT on foot outdoors: 1 MELEE = sword arc, 2 RANGE = laser (shared engine/combat.js). HP shows in the HUD when BEN is the selected fox. Knocked out = back on the nearest path at full HP (no gold lost yet; the defeat rule is Ben's to set).
- fox-kit makeFox now accepts a single torso colour (it shades it); fixed the room NPCs that passed one colour (console warnings gone).
- OPEN: rewards for wild kills (gold / XP: Ben to set) · Zadie + Nash pace in 2D, stand still here · phone check 390x844 / 844x390.
- TRY THIS: walk the Castle Path at night to the gate · stand in an Arena Path clearing and turn round (stalls, bunting) · walk to the lake under THE LAKE arch onto the boardwalk · on the Ruins Path step off into the grass near a rat, fight it (1 / 2), then run back onto the path and watch it give up · climb the Ruins Hills for the bats.

- BEN DECIDED (form, after 2c, done in part 4): LIGHTHOUSE at the PEARL FERRY DOCK pier end, climbable to the lamp; a SECOND LIGHTHOUSE on PEARL ISLAND. ELEVATED AREAS, all five: Falls hill + waterfall + overlook deck (from old Meru, worlds/meru-falls.js) · a ridge behind the Castle with a lookout · hills along the Ruins Path (creatures up there) · a hill park in the city with a skyline view · Pearl Island hills made taller. Build after the apartments (step 3 part 4).
- TRY THIS: ride the lift up at Town Square · wait for the train, walk in through an open door · walk all 4 cars · sit and look out on the way to Pearl Dock · get off, ride the lift down · buy a DAY ticket and fast travel back · take a taxi to the Castle · try it at night (lit windows, canopy lights) · rent a car, drive the ring road, flash the lights, honk at traffic, return it to the lot.

## 13. Step 5 status (the Lake)
- DONE (first pass): worlds/meru2-lake.js (data: LAKE in worlds/meru2-layout.js; backup before it: backup/meru2-step5/).
  - LAKESIDE SHELLS: School for the Blind (stone, blue hip roof), Jon's Boatworks (timber panel), Speedboat Bay boathouse (white panel) are now real city shells (meru2-city.js STY): gold sliding glass doors, sign, NOW HIRING sign (opens the job), cutaway inside.
  - JON'S BOATWORKS [jonBoatworks]: a speedboat up on a cradle under a yellow chain-hoist gantry, workbench + pegboards, props on the wall, planks, paint; roller door + concrete SLIPWAY into the lake on the south side. JON (Ben, after step 5: moved here from the Arena Path; look from the Boatworks game) stands by the boat. E by the door inside · PUT ME TO WORK = Jon Boatworks.dc.html.
  - SPEEDBOAT BAY boathouse [meruSpeedboatBay]: the course board (the 6 course stages by name), life-jacket rack, a spare speedboat on its trailer, fuel cans. E at the board · PLAY · SPEEDBOAT BAY.
  - SCHOOL FOR THE BLIND [meruBlindSchool]: yellow tactile guide strip from the door to the classroom, raised tactile map by the door, HOPE (cast.js) at the front by her desk and chalkboard (HOPE'S CLASS + braille A-J), her 5 named pupils at desks with braillers (JUNO, PIP, TOBI, MAE, RIO, looks from the school game), braille chart, bookshelves. E in front of Hope · PLAY · HOPE'S CLASS (the repo school page, self-contained).
  - JETTIES: Speedboat Bay jetty (T end) + Boatworks jetty. Plank decks on piles, rails, lantern posts that glow at night, ladder gaps: walk off a gap into the water, swim up to a ladder · CLIMB OUT.
  - THE SPEEDBOAT replaces the old rowboat (engine/vehicle-fun.js model, the same boat as Speedboat Bay). Moored at the bay jetty. FREE (Ben): a yellow FREE RENTAL TODAY! sign on the jetty by it, no talking needed. E = DRIVE THE SPEEDBOAT · FREE (from the jetty, the shore, or swimming up to it: CLIMB ABOARD). Stick/WASD: up throttle, down brake/reverse, left/right steer; drifts a little on the water. Game HUD vehicle "speedboat" (new entry): 1 HORN · 2 POWER TURN · 3 NITRO (2.5 s, recharges 8 s; Space too). Max 18 m/s, nitro 28 (DRAFT). Blocked by the shore, Pearl Island, jetties, the lighthouse pier + towers, buoys. E when slow = GET OUT: onto the nearest jetty ladder, else the nearest shore, else into the water. The boat stays where you leave it (stat meru2Boat). Wake rings behind it, synth engine that follows the speed, bump + splash sounds.
  - COURSE START: red/white gate buoys + START banner at (75, 300) off the bay jetty. Drive between them · START · SPEEDBOAT BAY (E) opens the course full-screen.
  - SWIMMING: Game HUD vehicle "swim" in the water: 1 GRAB (climb out at a ladder / climb aboard) · 2 KICK (speed burst) · 3 DIVE (just under the surface, 6 s of breath, tap again to come up; Space too). Ripple rings round the swimmer. The whole lake surface now has a slow moving ripple map.
  - LAKE FOLK: the fisherman (by the boathouse) and fisherwoman (Lake Path end) stand up as real foxes with their old looks (worlds/meru-lake.js FOXES).
- BEN DECIDED: Jon moved into the Boatworks · the speedboat is free (sign) · the pupils get names (the school game's 5).
- OPEN: note the old speaker key 'jon' in worlds/meru.js is named "Job" (role Jidda); the Boatworks uses Jon's look from the Boatworks game · the pupils' lines (Ben) · phone check 390x844 / 844x390 (boat camera, swim buttons).
- TRY THIS: walk the Lake Path to the boathouse, find the FREE RENTAL TODAY! sign and drive off · open it up on the lake, NITRO, POWER TURN · drive through the START gate and press E · get out in the middle of the lake, DIVE, swim back to a ladder and CLIMB OUT · drive over to the Boatworks slipway and moor at its jetty · walk into the School for the Blind along the yellow strip to Hope's class · at night: jetty lanterns.
- NEXT: step 6 (Pearl Island + deep pond diving, the ferry from the dock).

## 14. Step 6 status (Pearl Island, the deep pond dive, the ferry)
- DONE (first pass), in worlds/meru2-lake.js + LAKE.ferry / LAKE.island / islandJetty in worlds/meru2-layout.js.
  - THE DEEP POND DIVE [meruPearlDive]: new page `Meru Pearl Dive.dc.html` = the Jidda Deep Dive engine (minigames/jidda/deep-dive.js) with a new `theme: 'meru'` option (Jidda's own page is unchanged). Fresh green water, muddy bed, pond weeds instead of coral, HULL PEARLS (white 1 / gold 3 / black 10 / giant 25), depth bands SHALLOWS · MIDWATER · NELLY'S DEN, NELLY (green humps, spikes, big eyes) in place of the shark, a wooden raft with the pearl diver in place of Jib's boat, and NO radio lines (Jib's lines belong to Jidda; Ben writes the pond's voices). Own best score (meru.pond.best), flag meruPondDiver, 1 hullPearl item per 10 points banked, gold as in Jidda.
  - On the island: the PEARL DIVER (pearlDiver) at the pond's edge with a diving board and a THE DEEP POND sign. E there (or swimming in the pond) · DIVE · THE DEEP POND opens the dive full-screen. Reeds round the pond.
  - PEARL LOCALS: pearlLocal1 on the west beach by a pearl shack (thatched hut, pearl crates), pearlLocal2 on the east side. ~30 palms on the beach ring (15 on phones). A lantern trail from the island jetty up over the hill to the pond.
  - THE FERRY: a white/red PEARL FERRY with a cabin, rails, benches and a crew fox (ferryCrew, crowd). Free (DRAFT). 20 s at each end: the Pearl Ferry Dock pier (east side) and the new Pearl Island jetty (east beach); runs round the north of the island (~2 min round trip). Walk up to it while it is in: BOARD THE FERRY · TO …, you sit on the bench and ride (wide camera), you step off automatically at the other end (or E while it is in). The ferry status line shows on the dock, the pier and aboard. The speedboat can't drive through the ferry.
  - ferryCaptain stands on the dock by the ferry building (new avatar, no lines).
- OPEN for Ben: the pond dive's voices (the pearl diver, Nelly) · keep the Jidda creatures (eels, octopus, anglerfish, mines) in the Meru pond or swap them? · Nelly's lake battle from old Meru (worlds/meru-nelly.js) is not on the new lake yet · ferry price · phone check 390x844 / 844x390.
- TRY THIS: take the ferry from the Pearl Ferry Dock pier, ride round the island, step off on the island jetty · follow the lanterns up over the hill to the pond · talk to nobody, just walk to the pearl diver and DIVE · bank 40 and come back up · swim in the pond itself and dive from there · take the speedboat back, or swim.
- NEXT: step 7 (Skate Park + Tank Works on the map).

## 15. Step 7 status (Skate Park + Tank Works on the map)
- DONE (first pass): worlds/meru2-yards.js (data: YARDS in worlds/meru2-layout.js; backup before it: backup/meru2-step7/).
  - SKATE PARK [skatePark]: chain-link fence round x -240..-170 × z -50..44 (the ring road runs just east of it, so the old gate block on the road is gone), openings E (red SKATE PARK gate arch + NOW HIRING sign), W (Ruins Path) and S (to the Skate / Ruins Station). Raised BOWL with a bank ramp up to its deck, a 36 m HALF-PIPE with deck rails, FUNBOX, two ledges, a manual pad, two yellow rails, a 4-step stair set + handrail, two graffiti walls (MERU / SKATE), four floodlight masts (light pools at night). Every shape is a real walkable height.
  - TONY (look from the Skate Park game) by the street section: E · PLAY · SKATE PARK opens the minigame full-screen (same page as the sign). His BOARD RACK + a FREE BOARD (engine/vehicle-kit.js 'skate'): E = SKATE, ride it anywhere on land. Game HUD vehicle 'skate': stick up = push, down = brake, left/right = steer · 1 WHACK · 2 TRICK (kickflip, tap again in the air for bigger ones; land mid-flip = BAIL) · 3 / Space OLLIE. Slopes speed you up / slow you down, quarter pipes roll you back, a fast run up a lip launches you straight up and turns you round. E when slow = STEP OFF (the board stays there; FRESH BOARD at the rack brings it back). Session points show when you step off.
  - TREAD'S TANK WORKS [treadTankWorks]: now a real city shell (panel, yellow awning, gold glass door W, NOW HIRING). Inside: hazard-striped service bay, a tank up on red stands under a yellow gantry with a chain hoist, workbench + pegboard, tread rolls, a spare turret on a pallet, oil drums, parts shelves, ceiling lights. SGT. TREAD (look from the Tank Range game): E · PUT ME TO WORK = the Tank Works job.
  - TANK RANGE hangar [meruTankRange]: real shell too (door S). Range board on the back wall = E · PLAY · TANK RANGE, two briefing benches, ammo crates, a target rack. Outside: sandbag firing line, 5 bullseye targets, an earth berm, LIVE RANGE sign, a red range flag that flaps.
  - THE RANGE TANK by the hangar (DRAFT rule): once the range is passed (flag meruTankRange, or a saved Tank Range best score, or finaleBriefed) E = DRIVE THE TANK, else "PASS THE TANK RANGE FIRST". Game HUD vehicle 'tank': stick up/down = drive, left/right = turn on the spot · 1 ROCKET · 2 CANNON (muzzle flash, recoil, blast; fireworks only, nothing breaks) · 3 / Space TURBO. Stays inside the Barracks yard + base road (leash in YARDS). Saved where you leave it (stat meru2Tank).
  - PLANET DEFENSE GATE: fence round the base (x 212..268 × z -450..-398) with a red/white boom gate on the west side, red lamp = closed, green = open, PLANET DEFENSE sign. Same DRAFT rule as the tank. Walkers are blocked too while it is closed.
- OPEN for Ben: confirm the tank/gate rule (or set it) · the Tank Range page does not write the flag meruTankRange yet, the walk reads its saved best score instead · Tony + Tread lines (voiced later) · board rental price (free now) · the old Planet Defense plateau (worlds/meru-defense.js, 16 m up) is not on the 900 m map yet: the base is still the blockout block · phone check 390x844 / 844x390 (skate + tank camera, button labels).
- TRY THIS: walk in through the SKATE PARK arch, walk up the bowl ramp onto its deck · grab the free board by Tony's rack (E), push into the half-pipe and pump up and down, run it fast up a wall for a vert air, kickflip (2) and land it, then bail one · ollie onto a yellow rail · skate out of the park down the Ruins Path · talk to Tony (E · PLAY) · go to the Barracks, in through Tread's door, see the tank on the stands, PUT ME TO WORK · play the TANK RANGE from the hangar board · drive the tank to the PLANET DEFENSE gate (open after the range), fire the cannon at the targets · try it at night (floodlights, ceiling lights).
- NEXT: step 8 (spatial audio hooks for Ben's voice script + his sound design brief).

## 16. Step 8 status (spatial audio + hooks)
- DONE (first pass): worlds/meru2-audio.js, run by the walk every frame. Doc for Ben: AUDIO_HOOKS.md. File list: MERU/audio/manifest.json (music / rooms / voice; empty = synth placeholders).
  - LISTENER on the player, facing the camera direction.
  - ZONE MUSIC per music key, 2.8 s crossfade, busy zones 45 %, indoors 25 %, ducked 50 % under a voice. Synth pad per key until Ben's MP3s are listed.
  - ROOM TABLE built from BUILDINGS (+ the jail sub-room, + 'train' while aboard). Each room has a bed (synth murmur for busy rooms, room tone for the rest, or a listed file). Inside = full + its named reverb (generated impulse: cave 3.2 s, marble 0.9 s, halls 1.8 s). Outside = door leak by the rule: 55 % at the threshold, half at 6.8 m, 0 at 11 m, low-passed.
  - VOICES: the greeting trigger moved from the walk's test into the engine: one at a time, 7 m outdoors / 5.5 m indoors, same room only, 20 s rest. A listed greet clip plays through an HRTF panner at the fox (room reverb added); else a short placeholder murmur. walker.say(key, url) plays any line the same way (promise ends with the line) for the dialogue system; events onGreet / onZone / onRoom.
  - REAL RECORDINGS wired: the Monk's sermon at the fountain, the fish-talk pair at the fisherman, the bowling-talk pair inside Meru Lanes.
  - Walk HUD chip shows music (synth or file) · ROOM key · LEAK room %.
- OPEN for Ben: the music / room-bed / voice files (list them in the manifest) · per-room reverb by ear (names in BUILDINGS.reverb) · footsteps are still synth (6 surfaces) · the minigame panels keep their own audio.
- TRY THIS: stand at the fountain (the Monk's sermon, panned as you turn) · walk past the Tavern door and listen to the bed leak in and fade by 11 m · walk into the Casino (busy murmur, music drops) · Meru Lanes (bowling talk) · the Ruins Cave (long reverb) · cross from Fountain Plaza to Market Plaza (2.8 s crossfade).
- NEXT: step 9 (look-and-feel polish passes, then the phone pass + "try this" list).

## 19. Step 9 status (look-and-feel polish, several chats)
- PASS 1 DONE (skyline + night sky, worlds/meru2-blockout.js; backup in backup/meru2-step9/):
  - SKYLINE TOWERS: window grid drawn in the shader from world position (3.2 m bays × 3.6 m floors), so every tower gets correct-size windows with no textures, still 1 draw call. Day = darker mullion lines on 6 glass tints. Night = ~45 % of windows lit, warm or cool white, whole floors on/off for a lived-in look.
  - RED AVIATION BEACONS on every tower over 75 m, blinking.
  - NIGHT SKY: stars (500 on phones / 900) + a moon, both outside the fog.
  - NIGHT GRADE: moonlit blue hemisphere, ground / grass / lake darkened at night so lamps and windows read.
  - PATH LAMPS: warm light pools on the ground under every foot-path lamp at night (1 instanced draw).
- PASS 2 DONE (street level, worlds/meru2-city.js; backup in backup/meru2-step9/):
  - TWIN-ARM CITY LAMPS replace the round-top lamps in Town Square: post with a base, two arms, two flat lit heads, arms turned out over the path or ring road. Two light pools + two glows per lamp.
  - SHOP-WINDOW SPILL: warm light on the pavement every 5 m round the ground floor of every Town Square building at night.
  - FOUNTAIN at night: the basin glows teal, brighter jets, a wide light pool round it.
  - CARS at night: headlights + tail lights and a headlight beam on the road ahead (2 instanced draws, share the cars' matrices).
- PASS 3 DONE (neon blade signs, worlds/meru2-city.js): every Town Square building 6 m+ tall gets a projecting BLADE SIGN beside its first door (the side away from the NOW HIRING sign), the name's main word in stacked neon letters on both faces, on a dark panel with an arm. Glass/panel buildings cycle 6 neon colours (pink, cyan, yellow, green, orange, violet); the old stone ones (Tavern, Bank) get warm amber. Dim by day, full + a coloured glow at night. They fade with the cutaway. Test hooks: window.__meru2 (blockout, orbit) and window.__meru2City.
- PASS 4 DONE (dusk / dawn, worlds/meru2-blockout.js): day ↔ night is now a 0..1 blend through a DUSK keyframe (violet-to-coral sky, low orange sun from the west, warm fog, pinkish ground). NIGHT / T eases across it in ~4 s instead of snapping. Street lights, neon, beacons and lamp pools switch on at 40 % (as the sun goes down), tower windows fade in from 30 %, stars + moon from 55 %. The other modules keep their on/off setNight; only the blockout blends. API: setNight(on, instant) · setTime(t) · time().
- PASS 5 DONE (path-zone lamps at street level, worlds/meru2-paths.js; backup backup/meru2-step9/meru2-paths.pass5.js): coloured ground LIGHT POOLS under every path light at night (1 instanced draw, instance colours): orange under the Castle Path braziers + Arena Path torches (they flicker with the flame), warm yellow under the Lake Path lanterns, violet under the Ruins Path pillar lanterns. GATE LANTERNS: one on each Castle Gate tower and each Arena Gate pillar (warm, with a pool on the approach), two on the Lake arch posts, a violet lantern hanging under the whole Ruins arch. BOARDWALK BOLLARDS: low lit posts both sides of the Lake boardwalk every 6 m. All switch with setNight (on at 40 % of dusk).
- PASS 6 DONE (phone layout, Meru 2 Blockout.dc.html; checked at 390x844 + 844x390 with `phone-test.html`, two phone-size frames side by side):
  - Walk-mode page buttons (FLY VIEW · NIGHT · TAXI · TEST ARREST) are one stack now: a column on portrait (all 112 px wide), a ROW along the top on landscape phones (height < 520), so they no longer sit on top of the 1/2/3 action buttons. The place chip shrinks to leave room for them (it overlapped FLY VIEW by 10 px on portrait).
  - Fly view: the title card no longer runs under the NIGHT / VOICE RINGS / ZONE NAMES / SKYLINE column on portrait.
  - Taxi + train panel on landscape: map on the left, stop list on the right (was map on top and the list off-screen). Jail note shortened on landscape.
  - Every touch target is 44 px+. The Game HUD itself was not changed.
- STEP 9 DONE. NEXT: Ben tests on a real iPhone (frame rate, safe areas, notch) and says what Meru 2.0 needs next.
- PHONE TRY THIS: portrait — WALK IT, check the right-hand button column clears the place chip and the 1/2/3 buttons · turn the phone sideways — the buttons move into a row across the top · tap TAXI sideways: map left, stops right · TEST ARREST sideways: the jail card and PAY BAIL sit above the joystick.
- TRY THIS: fly view, NIGHT on, WHOLE MAP: look at the lit skyline and the blinking beacons · WALK IT at night and turn the camera up for the moon and stars · walk a foot path at night and follow the lamp pools · stand by the ring road at night and watch the headlights sweep past · walk round the fountain at night · look at the pavement outside the Tavern and Casino at night · walk along the Tavern front at night and look down the street at the amber TAVERN blade sign, then the Casino and Meru Lanes blades · fly view over Town Square, press NIGHT and watch the dusk roll in (lights come on part-way), press it again for dawn. · WALK IT at night up the Castle Path (flickering orange pools, gate lanterns), down the Arena Path to the gate, out to the Lake arch and boardwalk bollards, and west through the violet Ruins arch.
