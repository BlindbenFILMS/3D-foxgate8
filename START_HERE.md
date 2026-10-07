# 8 GATES 3D · MERU PACK

Everything needed to run and keep working on MERU (all maps + the newest fox).

## Open
- Meru Town Square.dc.html — the main Meru map (all zones + interiors)
- Meru Arena.dc.html · Meru Spacedock.dc.html · Meru Burgers.dc.html · Speedboat Bay.dc.html · Tank Range.dc.html
- Meru School for the Blind.dc.html — Hope subs: braille, touch art, cane walk, goalball (standalone interior; merges into the Meru map later). Phone check: Meru School Phone Preview.dc.html
- Meru Bridge.dc.html — ON HOLD (Ben), do not edit until he says
- Fox Workshop.dc.html — the fox look + Talking tab
- Meru Phone Preview.dc.html / Tank Mobile Preview.dc.html — iPhone 390x844 + 844x390 checks
Pages need a local web server (they load ES modules), e.g. `npx serve .` or VS Code Live Server.

## Read first
- PROJECT_NOTES.md — the project rules (copy of CLAUDE.md: mobile first, standard HUD, cast, style)
- BUILD_PLAN.md — full build plan + progress
- uploads/surface_meru.html — the 2D Meru source of truth (names, lines, quests, shops)

## The fox (one file for every fox)
- fox-kit.js — head, eyes, whiskers, painted talking mouth (word-timed visemes, teeth/tongue, snout lift, nods, ear flicks). Player = PLAYER_MALE, Hope = HOPE_LOOK, King = KING_MIGHT.
- engine/cast.js — the 3 heroes (player, Hope, Noble). Always build them with castKit().make().
- Talking: set `fox.userData.say = { text, t: 0 }` when a line starts and `fox.userData.talkStyle = { rate, amp, base, gest }`; fox-kit moves the mouth to the words and stops by itself.
  Wired on: Town Square (all NPCs + the player), Arena (King Might + Ben), Spacedock (guards + Ben). Bridge is on hold.

## Shared files (change once, every map follows)
- Game HUD.dc.html — phone + desktop HUD (joystick, 1/2/3 buttons, bag, menus, dialogue box)
- engine/save.js — one save for all worlds (localStorage 8gates.save.v1)
- village-game.js, engine/*.js — helpers, textures, story, combat, vehicles
