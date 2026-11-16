# KIT_CHANGES.md · Fox Fighters × the 8 Moon Peoples (s119, 15 Nov 2026)

## Shared files changed: NONE
The species kits and armour files are used exactly as they came from the main thread:
engine/species-leaders.js, engine/{alien,bear,bee,eagle,fly,gorilla,lizard,mantis}-kit.js,
engine/species-armor.js, engine/armor-sets.js, engine/armor-crests.js, engine/meru-faces.js, engine/fox-mouth3d.js.

## How Fox Fighters uses them
- **The main project's fox-kit.js is copied in as `fox-kit-moon.js`, unchanged.** Fox Fighters' own `fox-kit.js` (19 Oct) stays as it is, so Ben, Hope, Noble and the other 15 fighters look and fight exactly as before. Only the 8 leaders are built on the newer rig.
- `minigames/kyoto/duel-moon.js` (new, Fox Fighters only):
  - `initMoon(stage)` makes a second foxKit from fox-kit-moon.js and a castKit around it.
  - `leaderModel(id, scale)` calls `makeLeader()` and reads the joints it needs from `fox.userData.P`: arms → fore → hands, legs → shin → foot, body, head. Limb lengths are measured in the world, because the rig scales its limb groups.
  - Each frame it runs `userData.tickSpecies` and `tickArmor`.
- `duel-foxes.js rigFighter()` gets a `leader` rig. The duel's 2-bone IK drives the shoulders/elbows and hips/knees, the same way it drives the robots.
- Each leader's own weapon (`leaderWeapon(id)`) fills the SWORD slot, and a themed shot fills the LASER slot. These are new meshes made in duel-moon.js; nothing is added to the kits.
- The armour colours are read with `loadArmorSets()`, so Ben's Armor Workshop edits show up. No colours are hard-coded.
- The fighter lines in `LEADERS[].fight` are not changed. The specials and supers built from them live in sword-duel.js (SIG / SUPER) and are drafts for Ben's OK.
