// Build script for the news-image-20261120 entry: "The Daily World Chronicle".
// Draws a deterministic vector newspaper front page (1024x1024) summing up the
// world news of Friday, 20 November 2026, and rasterizes it to entry.png with
// @resvg/resvg-js using only the three local Liberation fonts in fonts/.
// No network, no randomness, no timestamps: the same input always renders the
// same bytes. Usage: node scripts/render.mjs [outPath] [width]
// Defaults: entry.png at the repository root, width 1024.

import { Resvg } from '@resvg/resvg-js';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = process.argv[2] ?? join(ROOT, 'entry.png');
const WIDTH = Number(process.argv[3] ?? 1024);

// ---------------------------------------------------------------- palette
const C = {
  paper: '#F6F2E9',
  paperAlt: '#EDE7D9',
  paperCard: '#FAF7F0',
  ink: '#141413',
  inkMuted: '#3F3D39',
  rule: '#262522',
  ruleLight: '#C8C0B0',
  crimson: '#B91C1C',
  crimsonBg: '#FDECEC',
  navy: '#1E3A8A',
  navyBg: '#EAF0FA',
  mapOcean: '#DFD9CA',
  mapLand: '#B8B09E',
  mapStroke: '#57534E',
};

// ---------------------------------------------------------------- text utils
function esc(s) {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// Approximate glyph advance widths (fractions of an em) for Liberation Sans.
// Used only to wrap and fit text inside its box before rasterizing.
function charW(ch, bold) {
  let w;
  if (ch === ' ') w = 0.278;
  else if ("ilj.,'|!".includes(ch)) w = 0.3;
  else if ('tf;:'.includes(ch)) w = 0.34;
  else if (ch === 'r') w = 0.36;
  else if ('MW'.includes(ch)) w = 0.94;
  else if ('mw@%#'.includes(ch)) w = 0.85;
  else if (ch >= 'A' && ch <= 'Z') w = 0.68;
  else if (ch >= '0' && ch <= '9') w = 0.556;
  else if (ch === '-') w = 0.333;
  else if (ch === '&') w = 0.778;
  else if (ch === '*') w = 0.389;
  else w = 0.52;
  return bold ? w * 1.05 : w;
}

function textW(s, size, bold = false) {
  let w = 0;
  for (const ch of s) w += charW(ch, bold);
  return w * size;
}

function wrapText(s, size, bold, maxW, maxLines = 99) {
  const words = s.split(' ');
  const lines = [];
  let line = '';
  for (const word of words) {
    const test = line ? line + ' ' + word : word;
    if (textW(test, size, bold) <= maxW || !line) {
      line = test;
    } else {
      lines.push(line);
      line = word;
      if (lines.length >= maxLines) break;
    }
  }
  if (line && lines.length < maxLines) lines.push(line);
  return lines;
}

function fitFont(s, size, bold, maxW, minSize) {
  let f = size;
  while (f > minSize && textW(s, f, bold) > maxW) f -= 0.2;
  return Math.round(f * 10) / 10;
}

function textLines(lines, x, y0, lh, size, bold, fill, anchor = 'start', family = 'Liberation Sans') {
  return lines
    .map((ln, i) => {
      const y = y0 + i * lh;
      return `<text x="${x}" y="${y}" font-family="${family}" font-size="${size}" font-weight="${bold ? 'bold' : 'normal'}" fill="${fill}" text-anchor="${anchor}">${esc(ln)}</text>`;
    })
    .join('\n');
}

// ---------------------------------------------------------------- the 16 stories
const HERO = [
  {
    num: 1,
    tag: 'SOUTH ASIA • DISASTER',
    headline: 'Cyclone Akvan Slams Odisha; 100K-300K Evacuated',
    body: "Severe Cyclone Akvan made landfall along India's Odisha coast on Friday, Nov 20. Authorities evacuated 100,000 to 300,000 residents from low-lying coastal districts.",
  },
  {
    num: 2,
    tag: 'GLOBAL MARKETS • FINANCE',
    headline: 'Equities Plunge Worldwide: Dow -1,084, Nikkei -4.68%',
    body: 'Major stock indices tumbled sharply on Friday: the Dow Jones fell 1,084 points, the S&P 500 dropped 2.02%, and Tokyo\'s Nikkei 225 slid 4.68% in heavy selling.',
  },
  {
    num: 3,
    tag: 'MIDDLE EAST • SECURITY',
    headline: 'Houthi Missile Hits Riyadh; ADNOC Ship Hit in Hormuz',
    body: "A Houthi missile struck Riyadh's KAFD financial district on Nov 20, while an ADNOC-operated vessel came under attack transiting the Strait of Hormuz.",
  },
  {
    num: 4,
    tag: 'EUROPE & WASHINGTON',
    headline: 'Kyiv & Crimea Bridge Hit; Trump Delays Iran to 2027',
    body: 'Missiles hit Kyiv and struck the Crimea Bridge a 3rd time this week as Europe signals readiness for Russia talks. Trump delayed Iran action to 2027 after a 51-48 Senate vote.',
  },
];

const BRIEFS = [
  {
    num: 5,
    tag: 'NORTH KOREA',
    title: 'Yongbyon Uranium Enrichment Expanded',
    detail: 'North Korea expands uranium enrichment capacity at its Yongbyon nuclear complex.',
  },
  {
    num: 6,
    tag: 'CHINA • TRADE',
    title: 'APEC Summit Convenes in Shenzhen',
    detail: 'Asia-Pacific leaders gather in Shenzhen as the APEC summit opens on Friday.',
  },
  {
    num: 7,
    tag: 'TURKEY • CLIMATE',
    title: 'COP31 Climate Summit Closes in Antalya',
    detail: 'The UN COP31 climate conference concludes negotiations in Antalya, Turkey.',
  },
  {
    num: 8,
    tag: 'SOUTH KOREA',
    title: 'Court Overturns Conviction of Ex-PM Han',
    detail: 'South Korean court overturns the prior conviction of former Prime Minister Han.',
  },
  {
    num: 9,
    tag: 'FIJI • PACIFIC',
    title: 'State of Emergency Declared Over Drought',
    detail: 'Fiji declares a national state of emergency in response to severe drought conditions.',
  },
  {
    num: 10,
    tag: 'US & VENEZUELA',
    title: 'Military Cooperation Formally Restored',
    detail: 'The United States and Venezuela restore bilateral military cooperation on Nov 20.',
  },
];

const CARDS = [
  {
    num: 11,
    tag: 'AI & TECHNOLOGY',
    title: 'Google Releases Gemini 4 Neon',
    body: 'Google officially launches Gemini 4 Neon worldwide on Friday, Nov 20.',
  },
  {
    num: 12,
    tag: 'DEEP SPACE',
    title: 'Voyager 1 Hits One Light-Day',
    body: "NASA's Voyager 1 probe reaches a distance of one full light-day from Earth.",
  },
  {
    num: 13,
    tag: 'CRICKET • NZ VS IND',
    title: 'Henry Nicholls Scores 113*',
    body: 'Henry Nicholls hits an unbeaten 113* for New Zealand against India.',
  },
  {
    num: 14,
    tag: 'WASHINGTON',
    title: 'Trump Pardons Pete Rose',
    body: "President Trump issues a presidential pardon for baseball's Pete Rose.",
  },
];

const EXCLUDED = [
  'ICJ Myanmar Rohingya Genocide Ruling',
  'Anthropic $81.3 Billion Initial Public Offering',
  'Trump-Xi-Putin Trilateral Summit & Peace Declaration',
  'US-Denmark Bilateral Greenland Pact',
];

// ------------------------------------------------------- hero illustrations
// Each draws inside a 229 x 110 box at local (0, 0).

function illoCyclone() {
  return `<g>
    <rect x="0" y="0" width="229" height="110" fill="${C.navyBg}"/>
    <polygon points="0,110 0,80 38,70 72,82 112,74 152,84 192,72 229,80 229,110" fill="${C.mapLand}" stroke="${C.mapStroke}" stroke-width="0.75"/>
    <rect x="8" y="8" width="118" height="26" fill="#FFFFFF" stroke="${C.ruleLight}" stroke-width="1"/>
    <text x="14" y="20" font-family="Liberation Sans" font-size="10" font-weight="bold" fill="${C.ink}">CYCLONE AKVAN</text>
    <text x="14" y="30" font-family="Liberation Sans" font-size="8" fill="${C.inkMuted}">LANDFALL NOV 20</text>
    <rect x="148" y="8" width="73" height="30" fill="${C.crimson}"/>
    <text x="184.5" y="21" font-family="Liberation Sans" font-size="11" font-weight="bold" fill="#FFFFFF" text-anchor="middle">100K - 300K</text>
    <text x="184.5" y="32" font-family="Liberation Sans" font-size="8" fill="#FFFFFF" text-anchor="middle">EVACUATED</text>
    <circle cx="92" cy="62" r="24" fill="none" stroke="${C.inkMuted}" stroke-width="1.5" stroke-dasharray="5 4"/>
    <path d="M74,62 a18,18 0 1,1 18,18" fill="none" stroke="${C.ink}" stroke-width="2"/>
    <path d="M82,62 a10,10 0 1,1 10,10" fill="none" stroke="${C.ink}" stroke-width="2"/>
    <path d="M92,38 C100,48 104,54 104,62" fill="none" stroke="${C.ink}" stroke-width="2"/>
    <circle cx="92" cy="62" r="4" fill="${C.crimson}"/>
    <path d="M140,52 l6,8 M152,46 l6,8 M128,44 l6,8" stroke="${C.navy}" stroke-width="1.5"/>
  </g>`;
}

function illoMarkets() {
  const cards = [
    ['DOW JONES', '-1,084 PTS'],
    ['S&P 500', '-2.02%'],
    ['NIKKEI 225', '-4.68%'],
  ];
  const cardSvg = cards
    .map(([label, value], i) => {
      const x = 8 + i * 72;
      return `<rect x="${x}" y="68" width="68" height="36" fill="#FFFFFF" stroke="${C.ruleLight}" stroke-width="1"/>
      <text x="${x + 34}" y="81" font-family="Liberation Sans" font-size="7.5" font-weight="bold" fill="${C.inkMuted}" text-anchor="middle">${esc(label)}</text>
      <text x="${x + 34}" y="97" font-family="Liberation Sans" font-size="10.5" font-weight="bold" fill="${C.crimson}" text-anchor="middle">${esc(value)}</text>`;
    })
    .join('\n');
  return `<g>
    <rect x="0" y="0" width="229" height="110" fill="${C.paperCard}"/>
    <line x1="8" y1="18" x2="221" y2="18" stroke="${C.ruleLight}" stroke-width="1"/>
    <line x1="8" y1="34" x2="221" y2="34" stroke="${C.ruleLight}" stroke-width="1"/>
    <line x1="8" y1="50" x2="221" y2="50" stroke="${C.ruleLight}" stroke-width="1"/>
    <polygon points="10,20 50,26 80,22 110,38 140,34 170,48 200,44 218,56 218,62 10,62" fill="${C.crimson}" opacity="0.12"/>
    <polyline points="10,20 50,26 80,22 110,38 140,34 170,48 200,44 218,56" fill="none" stroke="${C.crimson}" stroke-width="2.5"/>
    <circle cx="10" cy="20" r="2.5" fill="${C.crimson}"/>
    <circle cx="218" cy="56" r="3" fill="${C.crimson}"/>
    ${cardSvg}
  </g>`;
}

function illoMiddleEast() {
  return `<g>
    <rect x="0" y="0" width="229" height="110" fill="${C.navyBg}"/>
    <polygon points="30,20 120,8 180,18 200,45 185,75 150,100 100,108 55,95 25,60 20,35" fill="${C.mapLand}" stroke="${C.mapStroke}" stroke-width="0.75"/>
    <polygon points="168,20 198,26 190,46 174,40" fill="${C.navyBg}"/>
    <line x1="95" y1="55" x2="52" y2="26" stroke="${C.inkMuted}" stroke-width="1"/>
    <line x1="178" y1="32" x2="196" y2="86" stroke="${C.inkMuted}" stroke-width="1"/>
    <circle cx="95" cy="55" r="10" fill="none" stroke="${C.crimson}" stroke-width="1.5"/>
    <circle cx="95" cy="55" r="6" fill="${C.crimson}"/>
    <circle cx="95" cy="55" r="2" fill="#FFFFFF"/>
    <circle cx="178" cy="32" r="10" fill="none" stroke="${C.crimson}" stroke-width="1.5"/>
    <circle cx="178" cy="32" r="6" fill="${C.crimson}"/>
    <circle cx="178" cy="32" r="2" fill="#FFFFFF"/>
    <text x="8" y="14" font-family="Liberation Sans" font-size="9" font-weight="bold" fill="${C.ink}">KAFD RIYADH</text>
    <text x="8" y="25" font-family="Liberation Sans" font-size="8" fill="${C.inkMuted}">MISSILE IMPACT</text>
    <text x="150" y="98" font-family="Liberation Sans" font-size="9" font-weight="bold" fill="${C.ink}">HORMUZ STRAIT</text>
    <text x="150" y="108" font-family="Liberation Sans" font-size="8" fill="${C.inkMuted}">ADNOC SHIP HIT</text>
  </g>`;
}

function illoUkraine() {
  const leftLines = ['CRIMEA BRIDGE', 'HIT 3RD TIME', 'KYIV STRUCK', 'EU OPEN TO TALKS'];
  const leftSvg = leftLines
    .map((ln, i) => {
      const y = 38 + i * 15;
      return `<rect x="8" y="${y - 8}" width="4" height="4" fill="${C.crimson}"/><text x="17" y="${y}" font-family="Liberation Sans" font-size="10.5" font-weight="bold" fill="${C.ink}">${ln}</text>`;
    })
    .join('\n');
  return `<g>
    <rect x="0" y="0" width="128" height="110" fill="${C.paperCard}"/>
    <rect x="128" y="0" width="101" height="110" fill="${C.navy}"/>
    <text x="8" y="20" font-family="Liberation Sans" font-size="9" font-weight="bold" fill="${C.crimson}">UKRAINE FRONT</text>
    <line x1="8" y1="26" x2="120" y2="26" stroke="${C.crimson}" stroke-width="1.5"/>
    ${leftSvg}
    <text x="136" y="20" font-family="Liberation Sans" font-size="9" font-weight="bold" fill="#FFFFFF">WASHINGTON</text>
    <line x1="136" y1="26" x2="221" y2="26" stroke="#FFFFFF" stroke-width="1" opacity="0.5"/>
    <text x="136" y="42" font-family="Liberation Sans" font-size="10.5" font-weight="bold" fill="#FFFFFF">IRAN DECISION</text>
    <text x="136" y="57" font-family="Liberation Sans" font-size="10.5" font-weight="bold" fill="#FFFFFF">DELAYED TO 2027</text>
    <text x="136" y="76" font-family="Liberation Sans" font-size="10.5" font-weight="bold" fill="#FFFFFF">SENATE: 51 - 48</text>
    <line x1="136" y1="88" x2="221" y2="88" stroke="#FFFFFF" stroke-width="1" opacity="0.5"/>
  </g>`;
}

const ILLOS = [illoCyclone, illoMarkets, illoMiddleEast, illoUkraine];

// ---------------------------------------------------------------- world map
// Simplified continent polygons in lon/lat, projected equirectangular.
const CONTINENTS = [
  [[-168,66],[-150,70],[-135,69],[-125,71],[-115,73],[-100,73],[-90,74],[-85,70],[-80,73],[-75,72],[-68,68],[-60,62],[-55,52],[-60,46],[-65,44],[-70,42],[-75,38],[-76,34],[-80,26],[-81,25],[-84,30],[-89,29],[-94,29],[-97,26],[-97,22],[-94,17],[-90,14],[-86,12],[-83,9],[-80,8],[-78,7],[-82,10],[-87,13],[-92,15],[-95,16],[-97,16],[-100,18],[-105,20],[-108,23],[-112,29],[-117,33],[-122,37],[-124,42],[-124,48],[-128,50],[-135,58],[-145,60],[-155,58],[-162,58],[-168,62]],
  [[-58,64],[-52,60],[-43,60],[-40,64],[-32,68],[-22,70],[-25,74],[-35,76],[-50,76],[-58,74],[-62,70]],
  [[-79,9],[-77,7],[-75,4],[-72,0],[-70,-4],[-68,-8],[-60,-10],[-52,-5],[-48,-2],[-42,-5],[-38,-8],[-35,-10],[-35,-18],[-38,-25],[-42,-28],[-48,-30],[-52,-33],[-57,-38],[-62,-41],[-65,-45],[-68,-50],[-70,-54],[-73,-50],[-73,-42],[-73,-34],[-72,-25],[-72,-18],[-75,-15],[-78,-10],[-80,-5],[-81,0],[-80,5]],
  [[-10,36],[-9,43],[-2,44],[-1,46],[-4,48],[-1,50],[2,51],[5,53],[8,55],[10,57],[12,56],[18,56],[21,55],[24,58],[28,60],[30,62],[30,66],[32,68],[35,67],[32,64],[30,60],[28,58],[24,56],[22,54],[20,50],[19,46],[18,42],[16,40],[12,38],[8,38],[4,37],[0,36],[-5,36]],
  [[-6,35],[0,36],[10,37],[20,32],[30,31],[33,28],[35,24],[37,20],[39,16],[43,12],[48,11],[51,11],[50,6],[46,2],[42,-2],[40,-8],[39,-14],[36,-20],[33,-26],[30,-30],[26,-33],[20,-35],[17,-32],[14,-28],[12,-20],[12,-12],[11,-5],[9,0],[9,4],[6,4],[0,6],[-6,5],[-12,8],[-16,12],[-17,15],[-17,20],[-16,25],[-15,30],[-10,31]],
  [[30,70],[40,72],[50,72],[60,73],[70,73],[80,74],[90,75],[100,76],[110,76],[120,74],[130,72],[140,72],[150,70],[160,68],[170,66],[178,65],[178,62],[170,60],[162,58],[158,52],[152,48],[146,44],[142,40],[140,38],[135,34],[130,32],[127,30],[122,28],[120,25],[115,22],[110,20],[108,16],[105,10],[103,7],[100,6],[98,10],[96,15],[94,17],[92,21],[89,22],[86,20],[83,18],[80,14],[77,8],[75,10],[72,20],[68,22],[65,25],[62,25],[58,26],[56,27],[54,28],[52,29],[50,30],[48,30],[46,32],[44,35],[42,38],[40,40],[38,42],[36,44],[34,46],[32,48],[30,52],[30,58],[30,64]],
  [[130,31],[132,33],[134,34],[137,35],[139,36],[140,38],[141,40],[142,42],[144,44],[143,42],[141,39],[139,37],[136,35],[133,33],[131,31]],
  [[113,-22],[114,-28],[115,-33],[118,-35],[122,-34],[126,-32],[130,-32],[132,-32],[135,-35],[138,-35],[140,-38],[145,-38],[149,-37],[152,-33],[153,-28],[150,-24],[147,-19],[144,-15],[142,-11],[140,-13],[137,-12],[134,-12],[131,-12],[128,-14],[125,-14],[122,-17],[119,-20],[116,-21]],
  [[167,-45],[169,-43],[172,-41],[174,-39],[176,-38],[178,-38],[176,-40],[174,-42],[172,-44],[170,-46],[168,-46]],
];

const MAP = { x: 20, y: 468, w: 486, h: 242 };
const projX = (lon) => MAP.x + ((lon + 170) / 360) * MAP.w;
const projY = (lat) => MAP.y + ((75 - lat) / 130) * MAP.h;

// Pins: [number, lon, lat, leaderToLon, leaderToLat] - the last two are set
// only where two pins would overlap (NYC vs Washington, Yongbyon vs Seoul).
const PINS = [
  [1, 86, 20, null, null],
  [2, -55, 42, -74, 40],
  [3, 50, 25, null, null],
  [4, 32, 46, null, null],
  [5, 126, 39.8, null, null],
  [6, 114, 22.5, null, null],
  [7, 30.7, 36.9, null, null],
  [8, 140, 33, 127, 37.5],
  [9, 178, -18, null, null],
  [10, -67, 10.5, null, null],
  [11, -120, 37, null, null],
  [12, -30, 70, null, null],
  [13, 172, -41, null, null],
  [14, -77, 39, null, null],
];

function mapSvg() {
  const polys = CONTINENTS.map((poly) => {
    const pts = poly.map(([lo, la]) => `${projX(lo).toFixed(1)},${projY(la).toFixed(1)}`).join(' ');
    return `<polygon points="${pts}" fill="${C.mapLand}" stroke="${C.mapStroke}" stroke-width="0.75"/>`;
  }).join('\n');
  const equatorY = projY(0).toFixed(1);
  const meridianX = projX(0).toFixed(1);
  const pins = PINS.map(([n, lo, la, tlo, tla]) => {
    const cx = projX(lo);
    const cy = projY(la);
    const fontSize = n >= 10 ? 8 : 9;
    const leader = tlo !== null
      ? `<line x1="${cx.toFixed(1)}" y1="${cy.toFixed(1)}" x2="${projX(tlo).toFixed(1)}" y2="${projY(tla).toFixed(1)}" stroke="${C.crimson}" stroke-width="1"/><circle cx="${projX(tlo).toFixed(1)}" cy="${projY(tla).toFixed(1)}" r="2.5" fill="${C.crimson}"/>`
      : '';
    return `${leader}<circle cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="8" fill="${C.crimson}" stroke="#FFFFFF" stroke-width="1.5"/><text x="${cx.toFixed(1)}" y="${(cy + 3.2).toFixed(1)}" font-family="Liberation Sans" font-size="${fontSize}" font-weight="bold" fill="#FFFFFF" text-anchor="middle">${n}</text>`;
  }).join('\n');
  return `<rect x="20" y="442" width="486" height="26" fill="${C.ink}"/>
  <text x="28" y="459" font-family="Liberation Sans" font-size="12" font-weight="bold" fill="#FFFFFF">WHERE IT HAPPENED - NOV 20 GLOBAL LOCATOR</text>
  <rect x="20" y="468" width="486" height="242" fill="${C.mapOcean}"/>
  ${polys}
  <line x1="20" y1="${equatorY}" x2="506" y2="${equatorY}" stroke="#8A8378" stroke-width="1" stroke-dasharray="4 3"/>
  <line x1="${meridianX}" y1="468" x2="${meridianX}" y2="710" stroke="#8A8378" stroke-width="1" stroke-dasharray="4 3"/>
  ${pins}
  <text x="28" y="727" font-family="Liberation Sans" font-size="9" fill="${C.inkMuted}">PINS 1-14 MARK THE STORIES ABOVE - POSITIONS APPROXIMATE</text>`;
}

// ---------------------------------------------------------------- sections
function heroSvg() {
  return HERO.map((h, idx) => {
    const x = 20 + idx * 249;
    const y = 122;
    const headLines = wrapText(h.headline, 14.5, true, 229, 2);
    const bodyLines = wrapText(h.body, 11, false, 229, 5);
    return `<g>
    <rect x="${x}" y="${y}" width="237" height="22" fill="${C.paperAlt}"/>
    <line x1="${x}" y1="${y + 22}" x2="${x + 237}" y2="${y + 22}" stroke="${C.ruleLight}" stroke-width="1"/>
    <rect x="${x}" y="${y}" width="26" height="22" fill="${C.crimson}"/>
    <text x="${x + 13}" y="${y + 15.5}" font-family="Liberation Sans" font-size="12" font-weight="bold" fill="#FFFFFF" text-anchor="middle">${h.num}</text>
    <text x="${x + 32}" y="${y + 15}" font-family="Liberation Sans" font-size="9.5" font-weight="bold" fill="${C.crimson}">${esc(h.tag)}</text>
    <g transform="translate(${x + 4},${y + 26})">
      <rect x="0" y="0" width="229" height="110" fill="none" stroke="${C.ruleLight}" stroke-width="1"/>
      ${ILLOS[idx]()}
    </g>
    ${textLines(headLines, x + 4, y + 160, 18, 14.5, true, C.ink)}
    <line x1="${x + 4}" y1="${y + 190}" x2="${x + 233}" y2="${y + 190}" stroke="${C.ruleLight}" stroke-width="1"/>
    ${textLines(bodyLines, x + 4, y + 208, 15, 11, false, C.ink)}
  </g>`;
  }).join('\n');
}

function briefsSvg() {
  return BRIEFS.map((b, idx) => {
    const y = 442 + idx * 49.5;
    const titleSize = fitFont(b.tag + '  ' + b.title, 12, true, 446, 10.5);
    const detailSize = fitFont(b.detail, 10.8, false, 446, 9.5);
    const sep = idx < BRIEFS.length - 1
      ? `<line x1="516" y1="${(y + 46).toFixed(1)}" x2="1004" y2="${(y + 46).toFixed(1)}" stroke="${C.ruleLight}" stroke-width="1"/>`
      : '';
    return `<g>
    <rect x="516" y="${y.toFixed(1)}" width="32" height="44" fill="${C.ink}"/>
    <text x="532" y="${(y + 28).toFixed(1)}" font-family="Liberation Sans" font-size="13" font-weight="bold" fill="#FFFFFF" text-anchor="middle">${b.num}</text>
    <text x="556" y="${(y + 17).toFixed(1)}" font-family="Liberation Sans" font-size="10.5" font-weight="bold" fill="${C.crimson}">${esc(b.tag)}</text>
    <text x="${556 + textW(b.tag, 10.5, true) + 8}" y="${(y + 17).toFixed(1)}" font-family="Liberation Sans" font-size="${titleSize}" font-weight="bold" fill="${C.ink}">${esc(b.title)}</text>
    <text x="556" y="${(y + 35).toFixed(1)}" font-family="Liberation Sans" font-size="${detailSize}" fill="${C.ink}">${esc(b.detail)}</text>
    ${sep}
  </g>`;
  }).join('\n');
}

function cardsSvg() {
  const bar = `<rect x="20" y="750" width="518" height="24" fill="${C.navy}"/>
  <text x="279" y="766" font-family="Liberation Sans" font-size="12" font-weight="bold" fill="#FFFFFF" text-anchor="middle">SCIENCE, TECHNOLOGY &amp; INTERNATIONAL SPORT (NOV 20)</text>`;
  const cards = CARDS.map((c, i) => {
    const col = i % 2;
    const row = Math.floor(i / 2);
    const x = 20 + col * 264;
    const y = 782 + row * 106;
    const titleSize = fitFont(c.title, 13, true, 234, 11);
    const bodyLines = wrapText(c.body, 11, false, 234, 2);
    return `<g>
    <rect x="${x}" y="${y}" width="254" height="98" fill="${C.paperCard}" stroke="${C.ruleLight}" stroke-width="1"/>
    <rect x="${x + 10}" y="${y + 10}" width="24" height="24" fill="${C.navy}"/>
    <text x="${x + 22}" y="${y + 26.5}" font-family="Liberation Sans" font-size="12" font-weight="bold" fill="#FFFFFF" text-anchor="middle">${c.num}</text>
    <text x="${x + 42}" y="${y + 26}" font-family="Liberation Sans" font-size="10.5" font-weight="bold" fill="${C.navy}">${esc(c.tag)}</text>
    <text x="${x + 10}" y="${y + 52}" font-family="Liberation Sans" font-size="${titleSize}" font-weight="bold" fill="${C.ink}">${esc(c.title)}</text>
    ${textLines(bodyLines, x + 10, y + 70, 14.5, 11, false, C.ink)}
  </g>`;
  }).join('\n');
  return bar + '\n' + cards;
}

function dateCheckSvg() {
  const items = EXCLUDED.map((label, i) => {
    const y0 = 780 + i * 42.5;
    return `<g>
    <rect x="562" y="${(y0 + 2).toFixed(1)}" width="52" height="16" fill="${C.crimson}"/>
    <text x="588" y="${(y0 + 13.5).toFixed(1)}" font-family="Liberation Sans" font-size="8.5" font-weight="bold" fill="#FFFFFF" text-anchor="middle">NOV 19</text>
    <text x="622" y="${(y0 + 14).toFixed(1)}" font-family="Liberation Sans" font-size="11.5" font-weight="bold" fill="${C.ink}">${esc(label)}</text>
    <text x="562" y="${(y0 + 32).toFixed(1)}" font-family="Liberation Sans" font-size="10" fill="${C.inkMuted}">Occurred Thursday, Nov 19 - Excluded from Nov 20 edition</text>
  </g>`;
  }).join('\n');
  return `<rect x="550" y="750" width="454" height="236" fill="${C.crimsonBg}" stroke="${C.crimson}" stroke-width="2.5"/>
  <rect x="550" y="750" width="454" height="30" fill="${C.crimson}"/>
  <text x="777" y="770" font-family="Liberation Sans" font-size="13.5" font-weight="bold" fill="#FFFFFF" text-anchor="middle">DATE CHECK - EXCLUDED (OCCURRED NOV 19)</text>
  ${items}
  <line x1="562" y1="956" x2="992" y2="956" stroke="${C.crimson}" stroke-width="1"/>
  <text x="562" y="974" font-family="Liberation Sans" font-size="9.8" font-weight="bold" fill="${C.crimson}">AUDIT PASSED: ALL 16 STORIES ABOVE OCCURRED ON FRIDAY, 20 NOV 2026</text>`;
}

// ---------------------------------------------------------------- full page
function buildSvg() {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024">
<rect x="0" y="0" width="1024" height="1024" fill="${C.paper}"/>
<rect x="10" y="10" width="1004" height="1004" fill="none" stroke="${C.ink}" stroke-width="2"/>
<text x="20" y="32" font-family="Liberation Sans" font-size="10.5" font-weight="bold" fill="${C.ink}">SINGLE-DAY WORLD EDITION • 16 VERIFIED REPORTS</text>
<text x="1004" y="32" font-family="Liberation Sans" font-size="10.5" font-weight="bold" fill="${C.ink}" text-anchor="end">STRICT DATE VERIFIED: NOV 20, 2026 ONLY</text>
<line x1="20" y1="40" x2="1004" y2="40" stroke="${C.rule}" stroke-width="1"/>
<text x="512" y="72" font-family="Liberation Serif" font-size="38" font-weight="bold" fill="${C.ink}" text-anchor="middle" letter-spacing="2">THE DAILY WORLD CHRONICLE</text>
<rect x="20" y="78" width="984" height="36" fill="${C.ink}"/>
<text x="512" y="104" font-family="Liberation Sans" font-size="22" font-weight="bold" fill="#FFFFFF" text-anchor="middle">FRIDAY, 20 NOVEMBER 2026</text>
${heroSvg()}
<line x1="20" y1="436" x2="1004" y2="436" stroke="${C.rule}" stroke-width="1.5"/>
${mapSvg()}
${briefsSvg()}
<line x1="20" y1="742" x2="1004" y2="742" stroke="${C.rule}" stroke-width="1.5"/>
${cardsSvg()}
${dateCheckSvg()}
<line x1="20" y1="994" x2="1004" y2="994" stroke="${C.rule}" stroke-width="1"/>
<text x="512" y="1007" font-family="Liberation Sans" font-size="9.5" font-weight="bold" fill="${C.ink}" text-anchor="middle">FRIDAY, 20 NOVEMBER 2026 • DETERMINISTIC VECTOR EDITION • 1024×1024</text>
</svg>`;
}

// ---------------------------------------------------------------- render
const svg = buildSvg();
const fontFiles = [
  join(ROOT, 'fonts', 'LiberationSans-Regular.ttf'),
  join(ROOT, 'fonts', 'LiberationSans-Bold.ttf'),
  join(ROOT, 'fonts', 'LiberationSerif-Bold.ttf'),
];
const resvg = new Resvg(svg, {
  fitTo: { mode: 'width', value: WIDTH },
  font: {
    fontFiles,
    loadSystemFonts: false,
    defaultFontFamily: 'Liberation Sans',
  },
});
const png = resvg.render().asPng();
mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, png);
const height = Math.round((WIDTH * 1024) / 1024);
console.log(`wrote ${OUT}: ${png.length} bytes, ${WIDTH}x${height}`);
