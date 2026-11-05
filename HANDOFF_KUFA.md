# KUFA — HAND-BACK TO THE MAIN PROJECT (world chat → Meru project)

**World:** KUFA, the desert caravan town (8 GATES). **Layout:** `layout/kufa.layout.json`, version 5.
**Checker:** `kit/layout-check.js` gives 0 FAIL and 0 WARN. All 71 bracketed 2D rooms are present, 133 keys are unique, all 26 doors are linked, and everything is reachable on foot.
**Phases done:** 1 layout · 2 exteriors · 3 interiors · 4 jobs + games in the world. Phase 5 (avatars + story) is yours.
**Built:** 2026-10-22 → 2026-10-29, mobile first (every game tested at 390x844 and 844x390).

Ben's rules for this chat: build the MAP only. No avatars, story, quests or battles. Any avatars a game room brought with it are placeholders, to be replaced by the newest cast at the merge.

---

## 1. What is in this zip

| Path | What it is |
|---|---|
| `layout/kufa.layout.json` | **The layout** (PARALLEL_WORLDS.md section 2). Each building carries a `fit` record for its repo room. NPC spots use the 2D keys (`from2d` plus the 2D name). Story flags, party followers and kufaWarden are in `meta.cut`. |
| `Kufa World.dc.html` | The walkable world page: test fox, joystick, GO TO, DAY/NIGHT, phone frames, PLAY / RIDE buttons, and the game panel slots. |
| `worlds/kufa-walk.js` | Builds the whole world from the JSON: `buildKufa(THREE, L, C, {touch})`. Exteriors, signs, doors, terrain, lake, lamps, graphics polish. |
| `worlds/kufa-rooms.js` | Phase 3: the repo game rooms fitted into their buildings, plus dressed shops (Item Shop, Armory, Throne Room, Barracks, Tavern hall). |
| `worlds/kufa-interiors.js` | Phase 3: furnished rooms for the buildings with no repo room (Bank, Post, Watch House, Fire, Crier, Infirmary, Home, Brass & Blade, Astrolabe, Dune Rides, Ostrich Stable, Houses 1–4). |
| `worlds/kufa-games.js` | Phase 4 **host**: start → camera ease → game → BACK. Handles 'direct' and 'stage' games, panels, open-air spot games and idle sets. |
| `worlds/games/<key>.js` | One entry per game (key = building or spot key): `{ kind, panel, label, sub, src, near(), create() }`. |
| `worlds/kufa-rides.js` | OSTRICH + KANGAROO BOOTS ridden on the map. |
| `<Name> Play.dc.html` (×9) | Game panels. Each is the game's own page HUD, made transparent and click-through, and attached to the game the world started. |
| `minigames/kufa/<game>/` | Copied game modules. Imports are pointed at `minigames/kufa/kufa-engine.js`, and the world-mode changes are marked. |
| `minigames/kufa/jobs/` | The 3 NEW jobs (written for the world; no page version exists). |
| `minigames/kufa/kufa-engine.js` + `engine/*` + `fox-kit.js` | The small engine adapter (see 3B). |
| `backup/<game>/*.pre-world.js` | Untouched originals of every game file that changed. |
| `presets/cane.json`, `chair.json` | Hope's cane and Noble's chair (Backgammon). |
| `LAYOUT_NOTES.md` | The full build log: every decision, fix and graphics pass. |
| `Kufa Walk Preview.html` | Single-file walk-only build. Open it in any browser to walk the map. Games don't play in it. |
| Kit files (`kit/`, `Map Workshop`, `Layout Viewer`, `*.md` briefs, `vendor/`) | Unchanged. |

Not included: `uploads/surface_kufa.html` (your own 2D file, 8.9 MB).

---

## 2. What plays in the world (no load screen, never leaving the map)

| # | Game | Where (key) | Kind | Panel | Game file · what changed (all behind world mode; the game's own page is unchanged) |
|---|---|---|---|---|---|
| 1 | Backgammon | Tavern back parlour (`kufaTavern`) | direct | (UI drawn by Kufa World) | `backgammon/backgammon-club.js`: `opts.world` (group scene, camera child with lookAt converted, taps converted into the table frame, `api.tick` + `api.camera`, no own renderer, lights or rAF). Online play is not wired. |
| 2 | Kufa Creamery | `kufaCreamery` | stage | Creamery Play | `creamery/creamery-shift.js`: destroy() never removes the world canvas and is safe to call twice. |
| 3 | The Cistern Cup | stadium bowl (`kufaStadium`) | stage | Cistern Cup Play | `soccer/soccer-cup.js`: smaller sand floor, crowd placed in the game's frame, pop-up text projected from world space, destroy() fixes. The panel has its own stick and SHOOT / PASS / TACKLE (the Game HUD import is removed). |
| 4 | Rafiq's Spy Shop | front room (`kufaSpyShop`) | stage | Spy Shop Play | `spyshop/spy-shop.js`: `wp()` / `scr()` convert to and from the room frame; walk mode returns to the world; destroy() fixes. |
| 5 | Ummi's Camel Pen | the yard (`kufaCamelPen`) | stage | Camel Pen Play | `camel-pen/camel-pen.js`: helpers `toL` / `toW` / `lw` for the turned yard (origin 0.95, rotY 90°); drags follow the finger; destroy() fixes. |
| 6 | Fox Farm | field behind the farmhouse (`kufaFoxFarm`) | direct | Fox Farm Play | `farm/farm.js`: its own world mode already worked; one lens fix. Saves under `farmField.`. |
| 7 | Dominoes | the club (`kufaDominoes`) | direct | Dominoes Play | `dominoes/dominoes-club.js`: world mode like Backgammon. Online play is untested. |
| 8 | TREASURE DIG (new) | spot `kufaTreasureDig`, east dunes | direct, open air | Treasure Dig Play | `jobs/treasure-dig.js`: 6x6 hot/cold dig with beeps, 3 rounds, hint. |
| 9 | WELL TALLY KEEPER (new) | spot `kufaTallyBoard`, town square | direct, open air | Tally Keeper Play | `jobs/well-tally.js`: stamp FULL jars, catch Qasim's wrong ledger count, 3 shifts. |
| 10 | CARAVAN PACKER (new) | spot `kufaCaravanBoard`, bazaar | direct, open air | Caravan Packer Play | `jobs/caravan-packer.js`: balance the camel's two bags, pottery on top, 3 rounds of 45 s. |

All names, numbers and lines in the three new jobs are marked DRAFT. Qasim and Ghazi are only mentioned; they are not characters.

**Rides** (`worlds/kufa-rides.js`): the models are the Vehicle Workshop's own (`engine/vehicle-fun.js` funKit, copied unchanged), scaled to the test fox.
- **OSTRICH** waits outside the Ostrich Stable door. JUMP, and hold the button to glide.
- **KANGAROO BOOTS** wait on the Stadium Path. They bound while you move, each bound higher, up to 5.
- Both: RIDE / GET OFF with E. Rides stay outdoors and return home when you go 120 m away.
- Simple map version only. PECK / DUST KICK / STOMP / DROP-KICK and the real rider poses need your controller + cast (funKit update / press / pose).

---

## 3. Merge steps (PARALLEL_WORLDS.md section 4)

**A. Checker:** re-run `kit/layout-check.js` on `layout/kufa.layout.json` with the 2D room list from `surface_kufa.html`. It passes here.

**B. Bring it in**
1. Back up your current Kufa files. Copy in `layout/kufa.layout.json`, `worlds/kufa-*.js`, `worlds/games/`, `minigames/kufa/`, the 9 `* Play.dc.html` panels and `presets/`.
2. **The engine adapter** (`minigames/kufa/kufa-engine.js`). Every copied game imports its engine from this one file, not from village-game.js / meru-game.js (meru-game.js alone pulls in the whole Meru world). At the merge, point its re-exports back at your real files (same names, same signatures):
   - `engine/village.js` → your village-game helpers + Ambience
   - `engine/textures.js` → your `engine/textures.js`
   - `fox-kit.js`, `engine/cast.js`, `cane.js`, `chair.js` → your newest cast (Ben: these replace the copied avatars)
   - `engine/save.js` → **your real save** (the copy here keeps everything in memory)
   - `engine/restaurant-kit.js` → keep this copy's **WORLD MODE in createStage** (`globalThis.__kufaStageHost`: no own renderer or lights, the scene is a group in the building, the camera is a child with lookAt converted). Port that block into yours.
3. In `Kufa World.dc.html`, mount your Game HUD (`data-hud-host`) and the cast in place of the single test fox (a box fox with a gold X-ray).

**C. Join it to your data**
- **Keepers** are coloured box stand-ins with name tags (Jamil, Rafiq, Nasrin, Sura, Jibril, Ummi, Hadi, Zohra, Emir Tahir, Captain Idris). Put the real cast at their spots: room-local metres, +z toward the door, +x on your right as you walk in.
- **Castle gate guards** `kufaNpc01` and `kufaNpc02` have no 2D key (draft).
- **Station 9:** its 5 rooms are zones stacked under the oasis lake (`"under": "kufaOasis"`). The way in is the skiff dive buoy at the lake centre. Nothing is built inside yet.
- **Battle gates and the cave** are marked on the map. Nothing is wired; robots stay HACKED victims.
- **Story flags** (`kufaShopsSwapped` etc.) are in `meta.cut`. The layout follows what you SEE: sign ITEMS = Item Shop.

**D. Test:** walk it at 390x844 and 844x390. Every game: PLAY → play → BACK.

---

## 4. How the in-world games work (keep this pattern)

- Walk up → PLAY (or E) → the camera eases 1.7 s in real time from the walk camera to the game's camera. The game's own HUD shows over the world. BACK eases out, destroys the game and restores the room.
- **direct** games: the module takes `opts.world` and the host calls `api.tick(dt)` and reads `api.camera`.
- **stage** games (restaurant-kit): createStage runs in WORLD MODE.
- While a game plays, the world's copy of that room hides (the game brings its own). For stage games the shell, roof, signs and town door frames hide too (`world.doorFX`).
- **Open-air jobs:** `G.spot = true` gives a stand-in room at the layout spot. `G.idle` builds the job's set so it stands there while you walk.
- **Panels:** the root is `position:absolute; inset:0; pointer-events:none`, plus `data-kufa-panel`. Buttons and `[data-pe]` areas take touches. Mount with `window.__kufaGames.attach({ container, onState })`. Use `/* */` comments only in one-line scripts.
- **"← KUFA"** (shown for the Creamery, Cistern Cup, Spy Shop and Camel Pen) needs two taps so a stray thumb never quits a game. Panels with their own BACK hide it.

---

## 5. Known gaps (for the main project)

1. Online play (Backgammon, Dominoes) is not wired. It needs `engine/duel-net.js` + trystero.
2. Games keep their own small prefs in localStorage on their pages (`backgammonClub.*`, `kufa.spy.music`, `kufa.pen.muted`, `farmField.*`). Move these to the real save at the merge. The world itself uses only `kufa.layoutDraft`.
3. Fox Farm, landscape: the right column scrolls to reach BACK (same as Ben's page).
4. Two music files 404 (`KUFA-spy.mp3`, `KUFA-Icrecream.mp3`); both games fall back to synthesized music.
5. Station 9 interior, the cave interior and the battle maps are not built (markers only).
6. Ride specials and rider poses are left for the main controller (see section 2).

---

## 6. Kit notes for Ben (changes I did not make)

- **Map Workshop + Layout Viewer** may show "Failed to construct URL" in the newest canvas. Change their `url = p => new URL(p, location.href).href` to resolve from `document.baseURI`. Kufa World already does this.
- The Map Workshop checks without the 2D room list, so it shows 1 WARN; the Viewer passes with 0.
- Spot `room` local frame used here: metres from the building centre, +z toward the door. Worth adding to PARALLEL_WORLDS.md section 2.
- The checker has no field for interior-only rooms; Station 9 uses `"under": "kufaOasis"`.

---

## 7. Phone budget (measured)

- About 120 draw calls from the town square, plus about 8 from the graphics passes.
- About 280k triangles, plus about 95k instanced desert dressing.
- Static parts are merged by material; palms, rocks, scrub, door panels and light pools are instanced.
- Walled rooms draw only when you are inside or at the door; open rooms draw from 45 m.
- Phones get a lighter surface shader.
