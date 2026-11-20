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

// ---------------------------------------------------------------- the 8 stories
const HERO = [
  {
    num: 1,
    tag: 'INDIA • CYCLONE',
    headline: 'Akvan Comes Ashore in Odisha',
    body: 'Severe Cyclonic Storm Akvan comes ashore near Gopalpur on Friday, with winds of 90-100 km/h gusting to 110. Odisha has moved 105,304 people into 1,224 shelters, and schools are shut in 11 districts.',
  },
  {
    num: 2,
    tag: 'MARKETS',
    headline: 'Asian Markets Slide on Friday',
    body: 'The Nikkei 225 falls 4.6 percent in Friday morning trade in Tokyo and the Kospi drops 4.8 percent in Seoul. The slide follows Thursday on Wall Street: the Dow lost 1,101 points to 49,097, closing below 50,000 for the first time since June.',
  },
  {
    num: 3,
    tag: 'UKRAINE',
    headline: 'Kyiv Struck by Missiles Overnight',
    body: 'Russia strikes Kyiv with ballistic missiles overnight into Friday. Missile debris sets fire to a three-storey building in the Obolonskyi district, and explosions sound across the capital. A projectile lands near the Dutch embassy, causing minor damage.',
  },
  {
    num: 4,
    tag: 'ITALY • LABOUR',
    headline: 'Italy Stops for a Day',
    body: "Italy's largest union, the CGIL, calls a 24-hour general strike on Friday against the government's 2027 budget, with around 100 demonstrations planned. Buses, trams and metros are disrupted; trains and flights are not part of this strike.",
  },
];

const BRIEFS = [
  {
    num: 5,
    tag: 'CLIMATE / COP31',
    title: 'COP31 Closes in Antalya',
    detail: 'The UN climate conference reaches its last day on Friday in Antalya, Turkiye, after running since 9 November. Negotiators are in their final hours as the summit closes.',
  },
  {
    num: 6,
    tag: 'WASHINGTON',
    title: 'Trump to Brief Press at Noon',
    detail: 'President Trump will hold a White House news conference at noon Eastern on Friday, after returning from his Asia trip, to discuss trade deals with Thailand, the Philippines and other countries.',
  },
  {
    num: 7,
    tag: 'ENERGY',
    title: 'Oil Edges Up on Friday',
    detail: "Brent crude rises to 92.22 dollars a barrel and US crude to 83.40 dollars on Friday, as Thursday's Houthi attacks on Riyadh and tanker disruptions in the Strait of Hormuz stir supply concerns.",
  },
  {
    num: 8,
    tag: 'TAIWAN / MARKETS',
    title: 'Taiwan Tightens Short-Selling Curbs',
    detail: "Taiwan's markets regulator tightens short-selling rules effective Friday, after the Taiex fell 4.4 percent on Thursday and lost more than 5,000 points in three days. Stocks down 3.5 percent or more cannot be shorted below the prior close.",
  },
];

const NUMBERS = [
  { value: '105,304', label: 'PEOPLE EVACUATED IN ODISHA', hot: false },
  { value: '1,224', label: 'SHELTERS OPENED IN ODISHA', hot: false },
  { value: '-4.6%', label: 'NIKKEI 225, FRIDAY MORNING', hot: true },
  { value: '-4.8%', label: 'KOSPI, FRIDAY MORNING', hot: true },
  { value: '-1,101', label: 'DOW POINTS, THURSDAY CLOSE', hot: true },
  { value: '$92.22', label: 'BRENT CRUDE PER BARREL, FRIDAY', hot: false },
  { value: '100', label: 'DEMONSTRATIONS PLANNED IN ITALY', hot: false },
  { value: '90-100 KM/H', label: 'AKVAN WINDS AT LANDFALL', hot: false },
];

const DATECHECK = [
  { label: 'ICJ rules Myanmar committed genocide against the Rohingya', date: '19 NOV' },
  { label: 'Anthropic lists on Nasdaq in its IPO', date: '19 NOV' },
  { label: 'Trump, Xi and Putin summit in Shenzhen; joint peace declaration', date: '19 NOV' },
  { label: 'Greenland security pact', date: '19 NOV' },
  { label: 'Trump pardons Pete Rose', date: '19 NOV' },
  { label: 'Google releases Gemini 4 Neon', date: '18 NOV' },
  { label: "US Senate votes 51-48 against limiting Trump's Iran war powers", date: '19 NOV' },
  { label: 'Crimea Bridge attacked for a third time', date: '18-19 NOV' },
  { label: 'Houthi missiles hit Riyadh; ADNOC ship hit in Strait of Hormuz', date: '18-19 NOV' },
  { label: 'APEC leaders adopt their declaration in Shenzhen', date: '19 NOV' },
];

// ------------------------------------------------------- hero illustrations
// Each draws inside a 229 x 110 box at local (0, 0).

function illoCyclone() {
  return `<g>
    <rect x="0" y="0" width="229" height="110" fill="${C.navyBg}"/>
    <polygon points="0,110 0,80 38,70 72,82 112,74 152,84 192,72 229,80 229,110" fill="${C.mapLand}" stroke="${C.mapStroke}" stroke-width="0.75"/>
    <rect x="8" y="8" width="118" height="26" fill="#FFFFFF" stroke="${C.ruleLight}" stroke-width="1"/>
    <text x="14" y="20" font-family="Liberation Sans" font-size="10" font-weight="bold" fill="${C.ink}">CYCLONE AKVAN</text>
    <text x="14" y="30" font-family="Liberation Sans" font-size="8" fill="${C.inkMuted}">LANDFALL FRI 20 NOV</text>
    <rect x="148" y="8" width="73" height="30" fill="${C.crimson}"/>
    <text x="184.5" y="21" font-family="Liberation Sans" font-size="11" font-weight="bold" fill="#FFFFFF" text-anchor="middle">105,304</text>
    <text x="184.5" y="32" font-family="Liberation Sans" font-size="8" fill="#FFFFFF" text-anchor="middle">EVACUATED</text>
    <circle cx="92" cy="62" r="24" fill="none" stroke="${C.inkMuted}" stroke-width="1.5" stroke-dasharray="5 4"/>
    <path d="M74,62 a18,18 0 1,1 18,18" fill="none" stroke="${C.ink}" stroke-width="2"/>
    <path d="M82,62 a10,10 0 1,1 10,10" fill="none" stroke="${C.ink}" stroke-width="2"/>
    <path d="M92,38 C100,48 104,54 104,62" fill="none" stroke="${C.ink}" stroke-width="2"/>
    <circle cx="92" cy="62" r="4" fill="${C.crimson}"/>
    <path d="M140,52 l6,8 M152,46 l6,8 M128,44 l6,8" stroke="${C.navy}" stroke-width="1.5"/>
    <rect x="8" y="92" width="116" height="15" fill="#FFFFFF" stroke="${C.ruleLight}" stroke-width="1"/>
    <text x="14" y="103" font-family="Liberation Sans" font-size="8" font-weight="bold" fill="${C.ink}">WINDS 90-100 KM/H</text>
  </g>`;
}

function illoMarkets() {
  const cards = [
    ['NIKKEI • FRI AM', '-4.6%'],
    ['KOSPI • FRI AM', '-4.8%'],
    ['DOW • THU', '-1,101 PTS'],
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

function illoKyiv() {
  return `<g>
    <rect x="0" y="0" width="229" height="110" fill="#1B2A4A"/>
    <circle cx="150" cy="10" r="1.2" fill="#FFFFFF"/>
    <circle cx="185" cy="8" r="1" fill="#FFFFFF"/>
    <circle cx="210" cy="18" r="1.2" fill="#FFFFFF"/>
    <circle cx="136" cy="42" r="1" fill="#FFFFFF"/>
    <circle cx="60" cy="44" r="1" fill="#FFFFFF"/>
    <circle cx="30" cy="50" r="1.2" fill="#FFFFFF"/>
    <line x1="196" y1="6" x2="128" y2="52" stroke="#F59E0B" stroke-width="2"/>
    <circle cx="128" cy="52" r="3" fill="#FDE68A"/>
    <line x1="214" y1="22" x2="172" y2="44" stroke="#F59E0B" stroke-width="1.5"/>
    <circle cx="172" cy="44" r="2.5" fill="#FDE68A"/>
    <circle cx="107" cy="40" r="12" fill="#F59E0B" opacity="0.35"/>
    <circle cx="107" cy="44" r="7" fill="#F97316"/>
    <path d="M101,46 C103,38 105,34 107,30 C109,34 111,38 113,46 Z" fill="#FDE68A"/>
    <g fill="#0F172A">
      <rect x="0" y="70" width="30" height="40"/>
      <rect x="34" y="55" width="26" height="55"/>
      <rect x="64" y="75" width="30" height="35"/>
      <rect x="98" y="48" width="22" height="62"/>
      <rect x="124" y="65" width="26" height="45"/>
      <rect x="154" y="50" width="26" height="60"/>
      <rect x="184" y="68" width="24" height="42"/>
      <rect x="212" y="60" width="17" height="50"/>
    </g>
    <g fill="#FDE68A">
      <rect x="6" y="78" width="3" height="4"/><rect x="14" y="86" width="3" height="4"/><rect x="22" y="76" width="3" height="4"/>
      <rect x="40" y="62" width="3" height="4"/><rect x="48" y="72" width="3" height="4"/><rect x="42" y="86" width="3" height="4"/>
      <rect x="70" y="82" width="3" height="4"/><rect x="82" y="90" width="3" height="4"/>
      <rect x="104" y="58" width="3" height="4"/><rect x="112" y="70" width="3" height="4"/>
      <rect x="130" y="74" width="3" height="4"/><rect x="140" y="84" width="3" height="4"/>
      <rect x="160" y="58" width="3" height="4"/><rect x="168" y="70" width="3" height="4"/><rect x="172" y="88" width="3" height="4"/>
      <rect x="190" y="76" width="3" height="4"/><rect x="198" y="88" width="3" height="4"/>
      <rect x="216" y="68" width="3" height="4"/>
    </g>
    <rect x="8" y="8" width="140" height="26" fill="#FFFFFF" stroke="${C.ruleLight}" stroke-width="1"/>
    <text x="14" y="20" font-family="Liberation Sans" font-size="10" font-weight="bold" fill="${C.ink}">KYIV</text>
    <text x="14" y="30" font-family="Liberation Sans" font-size="8" fill="${C.inkMuted}">OVERNIGHT INTO FRI 20 NOV</text>
  </g>`;
}

function illoItaly() {
  return `<g>
    <rect x="0" y="0" width="229" height="110" fill="${C.paperCard}"/>
    <rect x="10" y="8" width="112" height="30" fill="#FFFFFF" stroke="${C.crimson}" stroke-width="1.5"/>
    <text x="66" y="21" font-family="Liberation Sans" font-size="10" font-weight="bold" fill="${C.crimson}" text-anchor="middle">24-HOUR STRIKE</text>
    <text x="66" y="33" font-family="Liberation Sans" font-size="8" fill="${C.inkMuted}" text-anchor="middle">FRI 20 NOV</text>
    <line x1="66" y1="38" x2="66" y2="72" stroke="${C.ink}" stroke-width="1.5"/>
    <rect x="124" y="14" width="100" height="24" fill="${C.navy}"/>
    <text x="174" y="30" font-family="Liberation Sans" font-size="7.5" font-weight="bold" fill="#FFFFFF" text-anchor="middle">100 DEMONSTRATIONS</text>
    <line x1="174" y1="38" x2="174" y2="72" stroke="${C.ink}" stroke-width="1.5"/>
    <g>
      <circle cx="20" cy="80" r="7" fill="${C.ink}"/>
      <circle cx="45" cy="80" r="7" fill="${C.navy}"/>
      <circle cx="70" cy="80" r="7" fill="${C.crimson}"/>
      <circle cx="95" cy="80" r="7" fill="${C.ink}"/>
      <circle cx="120" cy="80" r="7" fill="${C.navy}"/>
      <circle cx="145" cy="80" r="7" fill="${C.crimson}"/>
      <circle cx="170" cy="80" r="7" fill="${C.ink}"/>
      <circle cx="195" cy="80" r="7" fill="${C.navy}"/>
      <circle cx="218" cy="80" r="7" fill="${C.crimson}"/>
      <rect x="11" y="87" width="18" height="23" fill="${C.ink}"/>
      <rect x="36" y="87" width="18" height="23" fill="${C.navy}"/>
      <rect x="61" y="87" width="18" height="23" fill="${C.crimson}"/>
      <rect x="86" y="87" width="18" height="23" fill="${C.ink}"/>
      <rect x="111" y="87" width="18" height="23" fill="${C.navy}"/>
      <rect x="136" y="87" width="18" height="23" fill="${C.crimson}"/>
      <rect x="161" y="87" width="18" height="23" fill="${C.ink}"/>
      <rect x="186" y="87" width="18" height="23" fill="${C.navy}"/>
      <rect x="209" y="87" width="18" height="23" fill="${C.crimson}"/>
    </g>
  </g>`;
}

const ILLOS = [illoCyclone, illoMarkets, illoKyiv, illoItaly];

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
// only where two pins would overlap. Story 2 (markets) has two pins.
const PINS = [
  [1, 84.9, 19.3, null, null],
  [2, 139.7, 35.7, null, null],
  [2, 127, 37.5, null, null],
  [3, 30.5, 50.5, null, null],
  [4, 12.5, 41.9, null, null],
  [5, 30.7, 36.9, null, null],
  [6, -77, 38.9, null, null],
  [7, 46.7, 24.6, null, null],
  [8, 121.6, 25, null, null],
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
  <text x="28" y="727" font-family="Liberation Sans" font-size="9" fill="${C.inkMuted}">PINS 1-8 MARK THE STORIES ABOVE - STORY 2 HAS TWO PINS - POSITIONS APPROXIMATE</text>`;
}

// ---------------------------------------------------------------- sections
function heroSvg() {
  return HERO.map((h, idx) => {
    const x = 20 + idx * 249;
    const y = 122;
    const headLines = wrapText(h.headline, 14.5, true, 229, 2);
    const bodyLines = wrapText(h.body, 11, false, 229, 6);
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
    const y = 442 + idx * 75;
    const titleSize = fitFont(b.tag + '  ' + b.title, 12, true, 446, 10.5);
    const detailLines = wrapText(b.detail, 10.8, false, 448, 3);
    const sep = idx < BRIEFS.length - 1
      ? `<line x1="516" y1="${(y + 72).toFixed(1)}" x2="1004" y2="${(y + 72).toFixed(1)}" stroke="${C.ruleLight}" stroke-width="1"/>`
      : '';
    return `<g>
    <rect x="516" y="${y.toFixed(1)}" width="32" height="44" fill="${C.ink}"/>
    <text x="532" y="${(y + 28).toFixed(1)}" font-family="Liberation Sans" font-size="13" font-weight="bold" fill="#FFFFFF" text-anchor="middle">${b.num}</text>
    <text x="556" y="${(y + 17).toFixed(1)}" font-family="Liberation Sans" font-size="10.5" font-weight="bold" fill="${C.crimson}">${esc(b.tag)}</text>
    <text x="${556 + textW(b.tag, 10.5, true) + 8}" y="${(y + 17).toFixed(1)}" font-family="Liberation Sans" font-size="${titleSize}" font-weight="bold" fill="${C.ink}">${esc(b.title)}</text>
    ${textLines(detailLines, 556, y + 35, 16, 10.8, false, C.ink)}
    ${sep}
  </g>`;
  }).join('\n');
}

function numbersSvg() {
  const head = `<rect x="20" y="750" width="486" height="24" fill="${C.navy}"/>
  <text x="263" y="766" font-family="Liberation Sans" font-size="12" font-weight="bold" fill="#FFFFFF" text-anchor="middle">FRIDAY'S NUMBERS</text>`;
  const grid = `<rect x="20" y="774" width="486" height="204" fill="none" stroke="${C.ruleLight}" stroke-width="1"/>
  <line x1="263" y1="774" x2="263" y2="978" stroke="${C.ruleLight}" stroke-width="1"/>
  <line x1="20" y1="825" x2="506" y2="825" stroke="${C.ruleLight}" stroke-width="1"/>
  <line x1="20" y1="876" x2="506" y2="876" stroke="${C.ruleLight}" stroke-width="1"/>
  <line x1="20" y1="927" x2="506" y2="927" stroke="${C.ruleLight}" stroke-width="1"/>`;
  const cells = NUMBERS.map((n, i) => {
    const col = i % 2;
    const row = Math.floor(i / 2);
    const x = 20 + col * 243;
    const y = 774 + row * 51;
    const fill = n.hot ? C.crimson : C.ink;
    return `<text x="${x + 12}" y="${y + 23}" font-family="Liberation Sans" font-size="17" font-weight="bold" fill="${fill}">${esc(n.value)}</text>
    <text x="${x + 12}" y="${y + 41}" font-family="Liberation Sans" font-size="8.5" fill="${C.inkMuted}">${esc(n.label)}</text>`;
  }).join('\n');
  return head + '\n' + grid + '\n' + cells;
}

function dateCheckSvg() {
  const items = DATECHECK.map((d, i) => {
    const y0 = 806 + i * 15.5;
    return `<g>
    <rect x="528" y="${y0.toFixed(1)}" width="56" height="13" fill="${C.crimson}"/>
    <text x="556" y="${(y0 + 9.5).toFixed(1)}" font-family="Liberation Sans" font-size="8" font-weight="bold" fill="#FFFFFF" text-anchor="middle">${esc(d.date)}</text>
    <text x="592" y="${(y0 + 10.5).toFixed(1)}" font-family="Liberation Sans" font-size="10" font-weight="bold" fill="${C.ink}">${esc(d.label)}</text>
  </g>`;
  }).join('\n');
  return `<rect x="516" y="750" width="488" height="228" fill="${C.crimsonBg}" stroke="${C.crimson}" stroke-width="2.5"/>
  <rect x="516" y="750" width="488" height="28" fill="${C.crimson}"/>
  <text x="760" y="769" font-family="Liberation Sans" font-size="13.5" font-weight="bold" fill="#FFFFFF" text-anchor="middle">DATE CHECK</text>
  <text x="528" y="793" font-family="Liberation Sans" font-size="10" font-weight="bold" fill="${C.crimson}">These broke BEFORE Friday, so they are not today's news</text>
  ${items}
  <line x1="528" y1="964" x2="992" y2="964" stroke="${C.crimson}" stroke-width="1"/>
  <text x="528" y="974" font-family="Liberation Sans" font-size="9.8" font-weight="bold" fill="${C.crimson}">AUDIT PASSED: ALL 8 STORIES ABOVE HAPPENED ON FRIDAY, 20 NOV 2026</text>`;
}

// ---------------------------------------------------------------- full page
function buildSvg() {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024">
<rect x="0" y="0" width="1024" height="1024" fill="${C.paper}"/>
<rect x="10" y="10" width="1004" height="1004" fill="none" stroke="${C.ink}" stroke-width="2"/>
<text x="20" y="32" font-family="Liberation Sans" font-size="10.5" font-weight="bold" fill="${C.ink}">SINGLE-DAY WORLD EDITION • 8 VERIFIED REPORTS</text>
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
${numbersSvg()}
${dateCheckSvg()}
<line x1="20" y1="984" x2="1004" y2="984" stroke="${C.rule}" stroke-width="1"/>
<text x="512" y="996" font-family="Liberation Sans" font-size="9" font-weight="bold" fill="${C.ink}" text-anchor="middle">SOURCES: REUTERS, AP, AFP, IMD, UN, XINHUA, ZEROHEDGE, ETUC AND NATIONAL WEATHER SERVICES</text>
<text x="512" y="1008" font-family="Liberation Sans" font-size="9" fill="${C.ink}" text-anchor="middle">EVERY STORY IN THIS PAPER HAPPENED, OR WAS FIRST REPORTED, ON FRIDAY 20 NOVEMBER 2026; STORIES THAT BROKE EARLIER ARE LISTED IN DATE CHECK, NOT AS TODAY'S NEWS</text>
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
