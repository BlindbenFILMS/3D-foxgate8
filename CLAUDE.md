# FOX GATE 8 · 3D: project rules for Claude

## TOP PRIORITY: MOBILE FIRST
Design and check everything for phones first (portrait AND landscape), then desktop. Test at 390x844 and 844x390 before calling anything done. 44 px+ touch targets, joystick on the left, round buttons on the right, nothing overlapping, phone-sized performance budget (few draw calls, small textures, no shadows on phones).

## What this is
8 GATES Stewards, the 3D 8 GATES game. Full plan: the "8 GATES Stewards: Game Plan" doc
(https://claude.ai/code/artifact/3eaad9ff-d517-4128-9595-08514c3a8552). Stewards phases: STEWARDS_PLAN.md. The Meru 3D pack at the repo root has its own START_HERE.md, PROJECT_NOTES.md and BUILD_PLAN.md (update it every session).

## Layout
- Repo root: the Meru 3D pack (*.dc.html pages, engine/, worlds/, fox-kit.js, support.js = the .dc.html runtime).
- minigames/<NN-name>/: 35 standalone minigames exported from Claude Design; each folder's index.html forwards to its playable page (usually project/Main.dc.html).

## Decisions made (don't re-ask)
- 10 worlds, 5 types (Forest, Mountain, Desert, Ocean/islands, Ice), 2 of each: 5 home worlds (one per player), 5 frontier worlds settled later.
- Every home world: town square with 4 buildings (your house = the throne room, community center, shop, tavern) + a ship landing area (no spacedock yet). North = wild area with hostile creatures, East = hunting or fishing, South = resources, West = the starting mission.
- Grow by buying plans + hiring workers; recruit skilled people from other planets; house them; train and house an army; planetary defences; ships later.
- Story: Ben writes a chapter every week (chapters/chNN.json from the chapter template); a ready check (every steward lights their beacon) opens the next chapter.
- Multiplayer: no server. Trystero (Nostr) + WebRTC, as in the Blind Canvas gallery (engine/gallery-net.js in FOXgate8). Up to 5 players; evergreen minigames never touch the story; while away, world snapshots + patrol/defence policies, family-friendly raid rules (can be switched off).

## Media
Music and video from FOXgate8 live in the world folders at the repo root (e.g. MERU/MUSIC/..., MERU/videos/..., SPACE/videos/...). Keep folder names and paths unchanged. One exception: the old MINIGAMES/MUSIC songs live at minigames/MUSIC/ here (Windows can't keep MINIGAMES/ and minigames/ apart, and Pages is case-sensitive, so always write minigames/MUSIC/... in code). Large new videos: H.264 MP4, <= 30 MB per file (the upload bridge limit), faststart.

## Style carried over
Fox kit characters (fox-kit.js), toon shading + ink outlines, the established HUD (3 round buttons relabelled per game), the cast and their names. Keep room names exactly.

## Working rules
- Deploy: Claude writes into C:\Users\Ben Fox\Documents\8 GATES\all-files\FOXgate8-3D; Ben commits and pushes with GitHub Desktop; check on a phone.
- One consistent batch first, then tune one at a time.
- At the end of every session update BUILD_PLAN.md (Meru) / STEWARDS_PLAN.md: finished / partial / not started.
