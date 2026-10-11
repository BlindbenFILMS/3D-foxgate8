# FOX GATE 8 · Pearl Sail 3D + Roof Duel + Online (up to 4) — GitHub update

Unzip into the root of the repo (keep the folders), say YES to replace, then commit.

## What's in it
- **Pearl Sail 3D** (`Pearl Sail 3D Floor.dc.html` + `worlds/pearl-floor3d.js`): 3 floors + the atrium climb + the roof, breakable props, wall marks, damages bill, gates + black / red rugs, floor hazards, Office Blaster minigame (break room, floor 1), Machine Fleet posters, the binocular lookout, drone ambush, SUDS-9 roof fight → his challenge → the Roof Duel, online for up to 4.
- **Pearl Sail bots** (`worlds/pearl-bots.js`, `Pearl Sail Bot Workshop.dc.html`, `worlds/pearl-bot-workshop.js`).
- **Roof Duel** (`Kyoto Sword Duel.dc.html`, `minigames/kyoto/sword-duel.js`, `duel-foxes.js`, `duel-pearl-roof.js`, `Pearl Roof Duel.html`). Kyoto plays exactly as before without `?pearl=1`.
- **Online, up to 4** (`engine/world-net.js`, `vendor/trystero-nostr.js`): in the Pearl Sail and in **Meru 2** (`Meru 2 Blockout.dc.html`, `worlds/meru2-walk.js`, `worlds/meru2-net.js`).
- `BUILD_PLAN.md` (every change, what's tested, what's next) + `PEARL SAIL ROOF DUEL HANDOFF.md`.

## Test links (after GitHub Pages updates)
- `Pearl Sail 3D Floor.dc.html` — the start card has START ON FLOOR 1 / 2 / 3 / 4
- `Pearl Sail 3D Floor.dc.html?duel=1` — straight to SUDS-9's challenge
- `Pearl Roof Duel.html` — just the duel
- `Pearl Sail Bot Workshop.dc.html`
- `Meru 2 Blockout.dc.html?walk=1`

## Testing online
- **Two tabs, one computer:** add `?net=local` (e.g. `Pearl Sail 3D Floor.dc.html?net=local` in 2–4 tabs).
- **Two phones:** open the same page on both; anyone in the same world meets automatically. Or tap **INVITE** and send the link (private room `?room=CODE`).
- **Solo, no network:** `?net=off`.
- Real phone-to-phone over the internet has not been tested yet (it needs the public relays). Strict school / carrier networks can block it; those players simply play solo.

## Not in this update (next)
Split-screen with gamepads · fox pick per player (Ben / Noble / Hope) · watching a friend's duel after yours · online modes inside each Meru minigame.
