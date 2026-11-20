[![make.fun](https://make.fun/badge/news-image-20261120.svg)](https://make.fun/bounty/news-image-20261120)
[![rank](https://make.fun/badge/news-image-20261120/tunnelmoon/news-image-20261120/rank.svg)](https://make.fun/bounty/news-image-20261120)
[![reward](https://make.fun/badge/news-image-20261120/tunnelmoon/news-image-20261120/reward.svg)](https://make.fun/bounty/news-image-20261120)

# The Daily World Chronicle - Friday, 20 November 2026

One image that sums up the world news of Friday, 20 November 2026: a deterministic
vector newspaper front page (1024x1024) with 16 verified reports, a world locator map
with 14 pins, and a DATE CHECK box that excludes the big stories that happened on
Thursday, 19 November 2026 instead.

Entry for the make.fun bounty: https://make.fun/bounty/news-image-20261120

## How it works

- `scripts/render.mjs` builds the full front page as SVG and rasterizes it to
  `entry.png` with `@resvg/resvg-js`, using only the three local Liberation fonts
  in `fonts/` (system font fallback is off), so the render is byte-identical
  on any machine.
- `main.ts` is the competition entrypoint: standard library only, no network,
  no randomness, no timestamps. It copies `entry.png` to
  `$MAKEFUN_OUTPUT_DIR/entry.png`.

## Run it

```sh
npm install
npm run build:image   # renders entry.png (1024x1024)
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

Run `main.ts` twice and compare `sha256sum` of the output: both runs write
identical bytes.

## Referral

Built with make.fun - https://make.fun/r/jg1vyr82
