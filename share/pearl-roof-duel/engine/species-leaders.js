// 8 GATES · THE 8 MOON PEOPLES' LEADERS IN THEIR SPECIES ARMOUR (15 Nov 2026, Ben: for FOX FIGHTERS: "put the leader in their SPECIES ARMOUR").
// One entry per moon: the leader as the moon's own hall builds them (moons/<sp>/hall.js: scale, fur / chitin / feather colours), wearing the species' own
// armour set (engine/armor-sets.js id = the species, the shape = engine/species-armor.js dress<Species>), with the CAPE on (rank) and the set's crest.
// makeLeader(ctx, id) → a fox group; ctx = { THREE, M, toon, cast, CAST } (cast = engine/cast.js castKit, as moons/moon-stage.js avatar() builds a species).
// The fighter lines (style, specials, stats) are DRAFTS for Ben: nothing here is canon until he OKs it (CLAUDE.md: lore needs his OK).
import { armorOutfit, dressArmor, loadArmorSets } from './armor-sets.js';
import { mantisize, tickMantis } from './mantis-kit.js?v=s728dy';
import { beeize, tickBee } from './bee-kit.js?v=s728dv';
import { flyize, tickFly } from './fly-kit.js?v=s728n';
import { lizardize, tickLizard } from './lizard-kit.js?v=s728cr';
import { eagleize, tickEagle } from './eagle-kit.js?v=s728aa';
import { bearize, tickBear } from './bear-kit.js?v=s728ap';
import { gorillaize, tickGorilla } from './gorilla-kit.js?v=s728du';
import { alienize, tickAlien } from './alien-kit.js?v=s728dr';

export const SPECIES_KIT = { bee: [beeize, tickBee], mantis: [mantisize, tickMantis], fly: [flyize, tickFly], lizard: [lizardize, tickLizard], eagle: [eagleize, tickEagle], bear: [bearize, tickBear], gorilla: [gorillaize, tickGorilla], alien: [alienize, tickAlien] };

// order = round Meru (CLAUDE.md: SHASTA · LUXOR · UR · GAYA · ZION · NEBO · KUFA · JIDDA)
export const LEADERS = [
  { id: 'brannock', sp: 'bear', moon: 'SHASTA', people: 'BEAR', name: 'BRANNOCK', title: 'HEARTH ELDER', sex: 'm', scale: 1.18,
    look: { fur: '#7a6a5a', furDark: '#5a4a3c', muzzle: '#e0d8cc' }, colour: '#7cf2a0',
    fight: { style: 'The heaviest hitter. Slow, huge reach, shrugs off a hit.', weapon: 'black-iron staff with a glowing runestone', specials: ['HEARTH SLAM', 'LOG ROLL', 'RUNE ROAR'], stats: [5, 2, 4] } },
  { id: 'ossu', sp: 'alien', moon: 'LUXOR', people: 'GREY ALIEN', name: 'OSSU', title: 'OLD NAVIGATOR', sex: 'm', scale: 1.15,
    look: { skin: '#c4c8cc', skinDark: '#969ca2', skinLight: '#dde0e3' }, colour: '#4ff0ff',
    fight: { style: 'Keeps you at a distance. Floats, blinks, hits from afar.', weapon: 'the floating log-crystal', specials: ['STAR CHART', 'GRAV PULL', 'LOG FLASH'], stats: [2, 4, 3] } },
  { id: 'irisa', sp: 'mantis', moon: 'UR', people: 'MANTIS', name: 'IRISA', title: 'STILL MOTHER', sex: 'f', scale: 1.2,
    look: { chitin: '#a8d8a0', dark: '#6aa070', pale: '#eef4c8', eye: '#c8e87a' }, colour: '#5fbf7f',
    fight: { style: 'Stands still, then strikes faster than anyone. Counters.', weapon: 'scythe forearms', specials: ['STILL COUNTER', 'TWIN SCYTHE', 'LEAF STEP'], stats: [3, 5, 2] } },
  { id: 'ossa', sp: 'eagle', moon: 'GAYA', people: 'GRYPHON', name: 'OSSA GREYCREST', title: 'THE STORMWARDEN', sex: 'f', scale: 1.05,
    look: { brown: '#cfcac4', brownHi: '#e8e4de', cap: '#b4aea8', white: '#fbf8f2', tuft: '#7a7570', wing: '#a9a49e', wingHi: '#c9c4be', iris: '#d9dce8' }, colour: '#9fe8ff',
    fight: { style: 'Air fighter. Long jumps, dives, lightning from above. Blind: reads you by the wind.', weapon: 'white staff with a storm crystal', specials: ['STORM DIVE', 'WING GUST', 'LIGHTNING CALL'], stats: [3, 4, 3] } },
  { id: 'hobart', sp: 'gorilla', moon: 'ZION', people: 'GORILLA', name: 'HOBART STEELBACK', title: 'BOSS OF THE ROUNDHOUSE', sex: 'm', scale: 1.18,
    look: { fur: '#4a4644', furDark: '#34302e', silver: '#ece8e4', face: '#6a605a', faceDark: '#4a403a' }, colour: '#f2b705',
    fight: { style: 'A grappler. Grabs, throws, hydraulic knuckle rams.', weapon: 'knuckle rams', specials: ['PISTON PUNCH', 'TURNTABLE THROW', 'GROUND POUND'], stats: [5, 2, 4] } },
  { id: 'ambra', sp: 'bee', moon: 'NEBO', people: 'BEE', name: 'AMBRA', title: 'SPEAKER OF THE HIVE', sex: 'f', scale: 1.2,
    look: { fuzz: '#e8a317', fuzzDark: '#a8650c', black: '#2a1606', wing: '#fff2d0', vein: '#c9973e' }, colour: '#ffb020',
    fight: { style: 'Hovers and harries. Quick stings, a honey trap that slows.', weapon: 'stinger-sceptre', specials: ['STING RUSH', 'HONEY TRAP', 'SWARM CALL'], stats: [3, 4, 3] } },
  { id: 'zayd', sp: 'fly', moon: 'KUFA', people: 'SPY FLY', name: 'ZAYD FARSIGHT', title: 'ELDER OF THE DUSTWINGS', sex: 'm', scale: 1.0,
    look: { chitin: '#83878f', chitinHi: '#c2c6cc', hair: '#e8e8e8', eye: '#a8302a' }, colour: '#3fe0d0',
    fight: { style: 'The fastest. Darts in and out, jet-pack dashes, a spyglass bonk.', weapon: 'brass telescope', specials: ['JET DASH', 'SCARF WHIP', 'FAR SIGHT'], stats: [2, 5, 3] } },
  { id: 'tollan', sp: 'lizard', moon: 'JIDDA', people: 'GATOR', name: 'TOLLAN', title: 'GRAND BASKER', sex: 'm', scale: 1.35,
    look: { skin: '#6a7a62', skinDark: '#3a4632', belly: '#e8e4cc', crest: '#5aa89a', spots: '#3a4430' }, colour: '#2ec4b6',
    fight: { style: 'The biggest. A tail sweep, a snapping bite, slow but very hard to knock down.', weapon: 'carved sandstone staff', specials: ['TAIL SWEEP', 'DEATH ROLL', 'SUN BASK'], stats: [5, 1, 5] } },
];

// the leader's armour: the species' own set + the cape on (rank) + the set's crest
export function leaderSet(L, sets = loadArmorSets()) { const s = sets[L.sp]; if (!s) return null; const c = JSON.parse(JSON.stringify(s)); if (c.parts.cape) c.parts.cape.on = true; if (c.parts.crest) c.parts.crest.on = true; return c; }

export function makeLeader({ THREE, M, toon, cast, CAST }, id, sets) {
  const L = LEADERS.find(q => q.id === id || q.sp === id); if (!L) return null; const set = leaderSet(L, sets), K = SPECIES_KIT[L.sp], WK = { THREE, M, toon };
  const f = cast.make('player', { ...(set ? armorOutfit(set, CAST.player.look) : { outfit: 'robe' }), gear: 'none', merged: false });
  try { K[0](WK, f, L.look); } catch (e) { console.warn('leader', L.id, e && e.message); }
  if (set) try { dressArmor(WK, f, set); } catch (e) { console.warn('leader armour', L.id, e && e.message); }
  f.scale.multiplyScalar(L.scale); f.userData.sp = L.sp; f.userData.leader = L; f.userData.tickSpecies = K[1]; return f;
}
