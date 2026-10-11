# FOX GATE 8 · FULL UPDATE (fixes "could not load dynamic module")

The Meru 2 page on GitHub needs ~15 world files that were never pushed (meru2-townnet, meru2-relocate, meru2-yellowroad, meru2-fronts, meru2-roadside, meru2-tavdeck, meru2-plazapaths, meru2-stationlink, meru2-backpaths, meru2-banksign, meru2-stationnight, meru2-casino, meru2-grocery, meru2-nightlit, meru2-townpaths, …), so the browser couldn't load it.

This zip has EVERY file Meru 2, the Pearl Sail, the Roof Duel and the bot workshop need: all of `worlds/`, `engine/`, `vendor/`, `presets/`, the minigame files those pages load, the shared DCs (Game HUD, Welcome Card) and root scripts.

Unzip into the repo ROOT, keep the folders, replace everything, commit. Then try:
- Meru 2: https://blindbenfilms.github.io/3D-foxgate8/Meru%202%20Blockout.dc.html?walk=1
- Pearl Sail: https://blindbenfilms.github.io/3D-foxgate8/Pearl%20Sail%203D%20Floor.dc.html
- QR codes: https://blindbenfilms.github.io/3D-foxgate8/Play%20Links.dc.html

If anything still says "could not load", open the browser console: the missing file name is in the red error line. Send me that name.
