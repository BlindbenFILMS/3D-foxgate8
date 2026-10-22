/* AIRPORT TSA . rules, data and AI for 8 GATES 3D (pure JS, no three.js) */

export const TODAY = { text: '15 OCT 2026', short: '15 OCT', y: 2026, m: 10 };

/* Opponents: easy / medium / hard */
export const LEVELS = [
  { key: 'pip', name: 'PIP', title: 'ROOKIE', speed: 4.6, think: 2.5, err: 0.26, notice: 13, blurb: 'Rookie agent. Keen, a bit slow, misses things.' },
  { key: 'hope', name: 'HOPE', title: 'CLUB LEVEL', speed: 5.6, think: 1.7, err: 0.13, notice: 8, blurb: 'Works by feel and sound. Steady and sharp.' },
  { key: 'noble', name: 'NOBLE', title: 'MASTER', speed: 7.4, think: 1.0, err: 0.05, notice: 4, blurb: 'Glides in a hover chair. Rarely wrong.' },
];

export function makeRng(seed) {
  let a = (seed >>> 0) || 1;
  return function () {
    a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
export const pick = (r, a) => a[Math.min(a.length - 1, Math.floor(r() * a.length))];
export function shuffle(r, a) {
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); const t = a[i]; a[i] = a[j]; a[j] = t; }
  return a;
}
const pad2 = n => String(n).padStart(2, '0');

const FIRST = ['RUBY', 'OTTO', 'JUNE', 'MILO', 'IVY', 'REX', 'NOVA', 'FINN', 'SAGE', 'KIT', 'LOLA', 'BRAM', 'ZURI', 'PIA', 'TOBY', 'WREN', 'ODIN', 'MAE', 'JUDE', 'ROSA', 'ELLA', 'NICO'];
const LAST = ['VALE', 'FENN', 'BRUSH', 'EMBER', 'HOLLOW', 'RUSSET', 'THORNE', 'COPPER', 'MOSS', 'ASHBY', 'LARK', 'QUILL', 'MAPLE', 'BRISK', 'DUNE', 'FERRO'];

/* fur colours, grouped so a "different fox" photo is clearly different */
export const FURS = [
  { c: '#e8742c', g: 0 }, { c: '#d0581f', g: 0 }, { c: '#f0a050', g: 1 },
  { c: '#f3e7d3', g: 2 }, { c: '#b9b2a8', g: 3 }, { c: '#6b6460', g: 4 }, { c: '#7a4a2a', g: 5 },
];
export const OUTFITS = [
  { torso: ['#3b7dd8', '#2a2f45', '#ffd23a'], outfit: 'tee' },
  { torso: ['#e04b5a', '#2d2a33', '#ffffff'], outfit: 'coat' },
  { torso: ['#4caf7a', '#3a3328', '#ffd23a'], outfit: 'tee' },
  { torso: ['#ffd23a', '#384152', '#ec3013'], outfit: 'tee' },
  { torso: ['#8c5ad8', '#2a2a2a', '#ffd23a'], outfit: 'dress' },
  { torso: ['#f2f2f2', '#4a5a7a', '#ec3013'], outfit: 'coat' },
  { torso: ['#ff8a3d', '#30343f', '#ffffff'], outfit: 'tee' },
  { torso: ['#2bb3b1', '#3a2f2a', '#ffd23a'], outfit: 'dress' },
];
export const BAG_COLORS = ['#c0392b', '#2c6fbb', '#2f2f2f', '#e6b422', '#3f8f5a', '#8e44ad', '#d35400', '#7f8c8d'];
export const DESTS = [
  ['FX 204', 'KYOTO', 'A1'], ['FX 318', 'MERU STATION', 'A2'], ['FX 112', 'PEARL SAIL', 'A1'], ['FX 450', 'NINE REALMS', 'A2'],
  ['FX 077', 'LISBON', 'A1'], ['FX 921', 'REYKJAVIK', 'A2'], ['FX 630', 'OSAKA', 'A1'], ['FX 245', 'THRONE ROOM', 'A2'],
];

export function makePassenger(r, n, flawRate = 0.22) {
  const fur = pick(r, FURS), first = pick(r, FIRST), last = pick(r, LAST), d = pick(r, DESTS);
  const name = first + ' ' + last;
  const expY = 2027 + Math.floor(r() * 5), expM = 1 + Math.floor(r() * 12);
  const p = {
    n, name, idName: name, passName: name, fur: fur.c, photo: fur.c,
    flight: d[0], dest: d[1], gate: d[2], seat: (1 + Math.floor(r() * 30)) + pick(r, ['A', 'B', 'C', 'D', 'E', 'F']),
    date: TODAY.short, exp: pad2(expM) + '/' + expY, look: pick(r, OUTFITS), bagColor: pick(r, BAG_COLORS),
    flaw: null, flawText: '',
  };
  if (r() < flawRate) {
    const f = pick(r, ['name', 'expired', 'photo', 'date']);
    p.flaw = f;
    if (f === 'name') { let o = first; while (o === first) o = pick(r, FIRST); p.idName = o + ' ' + last; p.flawText = 'The name on the ID does not match the pass.'; }
    if (f === 'expired') { const y = 2023 + Math.floor(r() * 4); const m = y === 2026 ? 1 + Math.floor(r() * 9) : 1 + Math.floor(r() * 12); p.exp = pad2(m) + '/' + y; p.flawText = 'The ID has expired.'; }
    if (f === 'photo') { let o = fur; while (o.g === fur.g) o = pick(r, FURS); p.photo = o.c; p.flawText = 'The photo shows a different fox.'; }
    if (f === 'date') { p.date = pick(r, ['14 OCT', '16 OCT', '21 OCT', '09 OCT']); p.flawText = 'The boarding pass is for another day.'; }
  }
  return p;
}

/* X-ray items. w and h are in "bag widths" so shapes keep their aspect. */
export const ITEMS = {
  laptop: { label: 'LAPTOP', w: 0.34, h: 0.24 },
  shoes: { label: 'SHOES', w: 0.22, h: 0.15 },
  book: { label: 'BOOK', w: 0.13, h: 0.17 },
  phone: { label: 'PHONE', w: 0.06, h: 0.11 },
  charger: { label: 'CHARGER', w: 0.14, h: 0.1 },
  sweater: { label: 'SWEATER', w: 0.28, h: 0.2 },
  umbrella: { label: 'UMBRELLA', w: 0.36, h: 0.06 },
  camera: { label: 'CAMERA', w: 0.13, h: 0.1 },
  headphones: { label: 'HEADPHONES', w: 0.14, h: 0.12 },
  liquids: { label: 'SMALL LIQUIDS', w: 0.15, h: 0.12 },
  keys: { label: 'KEYS', w: 0.08, h: 0.08 },
  snacks: { label: 'SNACKS', w: 0.13, h: 0.09 },
  toy: { label: 'TEDDY', w: 0.12, h: 0.14 },
  hairdryer: { label: 'HAIR DRYER', w: 0.16, h: 0.12 },
  knife: { label: 'KNIFE', w: 0.24, h: 0.05, bad: true },
  scissors: { label: 'BIG SCISSORS', w: 0.2, h: 0.08, bad: true },
  bottle: { label: 'BIG BOTTLE', w: 0.08, h: 0.24, bad: true },
  hammer: { label: 'HAMMER', w: 0.24, h: 0.09, bad: true },
  spray: { label: 'SPRAY CAN', w: 0.06, h: 0.17, bad: true },
  fireworks: { label: 'FIREWORKS', w: 0.15, h: 0.12, bad: true },
};
export const SAFE = Object.keys(ITEMS).filter(k => !ITEMS[k].bad);
export const BAD = Object.keys(ITEMS).filter(k => ITEMS[k].bad);
export const BAG_ASPECT = 500 / 270; /* bag width / height on the x-ray screen */

export function makeBag(r, badRate = 0.38) {
  const n = 3 + Math.floor(r() * 4);
  const kinds = [];
  while (kinds.length < n) { const k = pick(r, SAFE); if ((k === 'laptop' || k === 'sweater') && kinds.includes(k)) continue; kinds.push(k); }
  let bad = 0;
  if (r() < badRate) { kinds[0] = pick(r, BAD); bad = 1; if (r() < 0.2 && n > 3) { kinds[1] = pick(r, BAD); bad = 2; } }
  shuffle(r, kinds);
  const cells = shuffle(r, [0, 1, 2, 3, 4, 5]);
  const items = kinds.map((k, i) => {
    const c = cells[i], d = ITEMS[k];
    const hw = d.w / 2 + 0.03, hh = (d.h * BAG_ASPECT) / 2 + 0.04;
    let x = ((c % 3) + 0.5) / 3 + (r() - 0.5) * 0.1, y = (Math.floor(c / 3) + 0.5) / 2 + (r() - 0.5) * 0.14;
    x = Math.min(1 - hw, Math.max(hw, x)); y = Math.min(1 - hh, Math.max(hh, y));
    return { kind: k, x, y, rot: (r() - 0.5) * 1.1, bad: !!d.bad, tag: false };
  });
  return { items, bad, color: pick(r, BAG_COLORS), type: pick(r, ['suitcase', 'duffel', 'backpack']) };
}

export const PTS = {
  idOk: 40, idCatch: 80, idWrongDeny: -60, idMissed: -100,
  tagBad: 30, tagSafe: -10, bagClear: 50, bagFound: 100, bagMissed: -150, bagFalse: -40,
  incAct: 100, incClear: 50, incFalse: -40, incMissed: -60, queue: -10,
};

export function judgeId(p, approve) {
  if (p.flaw) return approve
    ? { pts: PTS.idMissed, good: false, title: 'MISSED', text: p.flawText }
    : { pts: PTS.idCatch, good: true, title: 'CAUGHT', text: p.flawText };
  return approve
    ? { pts: PTS.idOk, good: true, title: 'GOOD ID', text: 'Everything matches.' }
    : { pts: PTS.idWrongDeny, good: false, title: 'WRONG CALL', text: 'That ID was fine.' };
}

export function judgeBag(bag, search) {
  const tb = bag.items.filter(i => i.tag && i.bad).length, ts = bag.items.filter(i => i.tag && !i.bad).length;
  let pts = tb * PTS.tagBad + ts * PTS.tagSafe;
  const names = bag.items.filter(i => i.bad).map(i => ITEMS[i.kind].label).join(' + ');
  if (bag.bad) {
    if (search) return { pts: pts + PTS.bagFound, good: true, title: 'FOUND: ' + names, text: 'Bag searched. The item is taken away.' };
    return { pts: pts + PTS.bagMissed, good: false, title: 'MISSED: ' + names, text: 'A banned item got through.' };
  }
  if (!search) return { pts: pts + PTS.bagClear, good: true, title: 'CLEAN BAG', text: 'Nothing banned. Good call.' };
  return { pts: pts + PTS.bagFalse, good: false, title: 'NOTHING FOUND', text: 'The search slowed the line.' };
}

/* Incidents found while patrolling. Texts stay at 20 words or fewer. */
export const INC = {
  bag: { title: 'UNATTENDED BAG', act: 'REPORT BAG', real: 'A bag sits alone on a seat. No owner anywhere near it.', fake: 'A bag on a seat. Its owner sits right beside it.' },
  door: { title: 'STAFF DOOR', act: 'SHUT + LOCK', real: 'The STAFF ONLY door is propped open with a box.', fake: null },
  tail: { title: 'STAFF DOOR', act: 'STOP + CHECK', real: 'A passenger tugs at the STAFF ONLY door. No badge.', fake: 'A pilot in uniform swipes a staff badge at the door.' },
  spill: { title: 'SPILL', act: 'PLACE CONE', real: 'Coffee all over the floor. No wet-floor cone yet.', fake: null },
  lost: { title: 'LOST ITEM', act: 'TURN IN', real: 'A wallet left behind on an empty seat.', fake: null },
  wrong: { title: 'EXIT LANE', act: 'STOP FOX', real: 'A passenger walks IN through the EXIT lane, skipping security.', fake: 'A pilot walks OUT through the exit lane. That is allowed.' },
};

export function judgeInc(inc, act) {
  const d = INC[inc.type];
  if (inc.real) return act
    ? { pts: PTS.incAct, good: true, title: d.title + ' HANDLED', text: 'Good eyes.' }
    : { pts: PTS.incMissed, good: false, title: 'MISSED IT', text: 'That one was real.' };
  return act
    ? { pts: PTS.incFalse, good: false, title: 'FALSE ALARM', text: 'Nothing wrong there.' }
    : { pts: PTS.incClear, good: true, title: 'ALL CLEAR', text: 'Right. Nothing to report.' };
}

/* AI choices */
export function aiId(p, lvl, r) { const right = r() > lvl.err; return p.flaw ? !right : right; }
export function aiBag(bag, lvl, r) {
  const right = r() > lvl.err;
  const search = bag.bad ? right : !right;
  const tags = [];
  bag.items.forEach((it, i) => { if (it.bad && search) tags.push(i); });
  if (!right && r() < 0.5) { const s = bag.items.findIndex(i => !i.bad); if (s >= 0) tags.push(s); }
  return { search, tags };
}
export function aiInc(inc, lvl, r) { const right = r() > lvl.err * 0.8; return inc.real ? right : !right; }

export function stars(score, sec) { const k = sec / 180; return score >= 1000 * k ? 3 : score >= 600 * k ? 2 : score >= 250 * k ? 1 : 0; }
export function gold(score, won) { return Math.max(0, Math.round(score / 25)) + (won ? 25 : 5); }

export const PA = [
  'Please keep your bags with you at all times.',
  'Liquids over 100 ml go in checked bags.',
  'Flight FX 204 to Kyoto is now boarding at Gate A1.',
  'Never leave a bag alone. Report anything odd to staff.',
  'Final call for Meru Station at Gate A2.',
  'Laptops out of your bag at security, please.',
];

export const DEMO = {
  start: 'DEMO: two agents work one shift. Watch how it plays, then pick a mode in MENU.',
  id: 'Check the ID: name, photo, and both dates against today.',
  xray: 'Tag anything sharp, big liquids, tools, spray cans or fireworks. Then clear or search.',
  patrol: 'Walk the floor. Look for lone bags, open doors, spills and wrong-way walkers.',
  inc: 'Inspect it. Act if it is real. Clear it if all is fine.',
  radio: 'RADIO shows every open incident on the map for a few seconds.',
};
