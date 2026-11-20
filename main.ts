// news-image-20261120 entrypoint: writes the finished front page to
// $MAKEFUN_OUTPUT_DIR/entry.png.
//
// The image is produced deterministically at build time by
// scripts/render.mjs (a flat vector newspaper page rendered with resvg from
// local Liberation fonts only) and shipped in this repository as entry.png.
// This program only copies those bytes, so both graded runs write identical
// output. Standard library only, no network, no randomness, no timestamps.
//
// Local check: mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { copyFileSync, mkdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const source = join(here, 'entry.png');
const outDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';
const dest = join(outDir, 'entry.png');

mkdirSync(outDir, { recursive: true });
copyFileSync(source, dest);

const bytes = statSync(dest).size;
const header = readFileSync(dest);
// A PNG stores its width and height as big-endian uint32 at offsets 16 and 20.
const width = header.readUInt32BE(16);
const height = header.readUInt32BE(20);
console.log(`entry.png: ${bytes} bytes, ${width}x${height}`);
