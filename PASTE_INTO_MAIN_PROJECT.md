Hi Claude! This is the KUFA world handback from the world-layout chat (8 GATES). The zip KUFA-MAP-HANDOFF.zip is attached.

Please merge KUFA into the main game:
1. Read HANDOFF_KUFA.md first (in the zip). It lists every file, what plays where, the merge steps and the known gaps. LAYOUT_NOTES.md has the full build log.
2. Back up our current Kufa files, then bring in layout/kufa.layout.json, worlds/kufa-*.js, worlds/games/, minigames/kufa/, the 9 "* Play.dc.html" game panels and presets/.
3. Point minigames/kufa/kufa-engine.js back at our real engine files (village helpers, textures, the NEWEST cast + fox-kit, the real save). Keep and port the WORLD MODE block in its restaurant-kit createStage.
4. Swap the single test fox and the box stand-in keepers for our real cast. The keeper spots are in the layout.
5. Keep the in-world games pattern (worlds/kufa-games.js): walk up → PLAY → camera eases into the game → BACK. No load screen, never leaving the map.
6. Run kit/layout-check.js and the merge checklist (PARALLEL_WORLDS.md section 4), then test every game and both rides (OSTRICH, KANGAROO BOOTS) at 390x844 and 844x390 first.
7. Then on to phase 5: avatars + the NEW Kufa storyline, quests and battles.

The names, numbers and lines in the three new jobs (Treasure Dig, Well Tally Keeper, Caravan Packer) are DRAFT. Ask me before changing what plays.
