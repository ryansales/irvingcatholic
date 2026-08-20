#!/usr/bin/env node
/* Resizes owner-supplied photos into the two shapes listing.html renders, and
   writes them into site/images/ under the naming the data file expects.

   Run it by hand when photos arrive for a listing — it is not a build step and
   nothing in CI calls it. sharp is the only dependency and it lives in
   tools/package.json, never the repo root, so Netlify never installs anything:

     cd tools && npm install          # once
     node tools/process-photos.mjs --id church-of-the-incarnation \
       ~/photos/PXL_...648.jpg ~/photos/mary.jpg ~/photos/font.jpg ~/photos/elevation.jpg

   The first path is the hero, the next three are the gallery. Append :top,
   :bottom, :left, :right, :centre or :attention to any path to steer the crop:

     ~/photos/mary.jpg:top

   Output is JPEG, progressive, EXIF stripped (these are photos of identifiable
   people in a parish — GPS and camera serials should not ship). Orientation is
   baked in first, so a phone portrait does not land sideways.

   Nothing is written unless every source file reads cleanly, so a typo in the
   fourth path cannot leave two-thirds of a listing updated. */

import { existsSync, mkdirSync, statSync } from 'node:fs';
import { basename, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(fileURLToPath(new URL('.', import.meta.url)), '..');
const IMAGES_DIR = join(ROOT, 'site', 'images');

/* Both shapes are driven by what listing.html actually paints, at 2x.

   Hero: a 340px-tall band inside a max-width:1040px, padding:0 28px container,
   so ~984x340 (2.89:1) on desktop and it is a CSS background at center/cover.
   The stored image is 16:9 because heroPhoto is also what seo.js hands to
   og:image and schema.org, and 1600x900 clears Facebook's 1200x630 floor. Be
   aware the browser then crops that 16:9 file down to the band's 2.89:1 — only
   the middle ~61% of the image's height is visible on a desktop detail page,
   so the subject wants to sit near the vertical centre of the crop.

   Gallery: grid-template-columns:1fr 1fr 1fr with a 12px gap inside the 624px
   main column, so each tile is ~200x150 at aspect-ratio:4/3. 800x600 is 4x the
   CSS size, which leaves room for the mobile layout where tiles stretch wider. */
const SHAPES = {
  hero: { w: 1600, h: 900, quality: 82 },
  gallery: { w: 800, h: 600, quality: 80 },
};

const VALID_POSITIONS = new Set([
  'centre', 'center', 'top', 'bottom', 'left', 'right',
  'entropy', 'attention',
]);

function fail(message) {
  console.error(`process-photos: ${message}`);
  process.exit(1);
}

function parseArgs(argv) {
  let id = null;
  const sources = [];
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--id') {
      id = argv[++i] ?? null;
    } else if (arg.startsWith('--id=')) {
      id = arg.slice('--id='.length);
    } else if (arg.startsWith('--')) {
      fail(`unknown flag "${arg}"`);
    } else {
      sources.push(arg);
    }
  }
  return { id, sources };
}

/* A Windows path ("C:\photos\x.jpg") has a colon that is not a crop hint, and a
   filename can legitimately contain one. Only split on the last colon, and only
   when what follows it is a position keyword. */
function splitFocus(spec) {
  const at = spec.lastIndexOf(':');
  if (at > 0) {
    const tail = spec.slice(at + 1);
    if (VALID_POSITIONS.has(tail)) return { path: spec.slice(0, at), position: tail };
  }
  return { path: spec, position: 'centre' };
}

const { id, sources } = parseArgs(process.argv.slice(2));

if (!id) fail('missing --id <listing-id>  (the "id" field of the listing in site/directory-data.js)');
if (!/^[a-z0-9-]+$/.test(id)) fail(`--id "${id}" is not a slug — expected lowercase letters, digits and hyphens`);
if (!sources.length) fail('no source images given — first path is the hero, the next three are the gallery');
if (sources.length > 4) fail(`${sources.length} source images given — listing.html renders one hero and at most three gallery tiles`);

let sharp;
try {
  ({ default: sharp } = await import('sharp'));
} catch {
  fail('sharp is not installed — run "cd tools && npm install" first');
}

/* HEIC is what an iPhone hands you by default and sharp's stock build cannot
   decode it, so say that plainly instead of surfacing a libvips error. */
const jobs = sources.map((spec, index) => {
  const { path, position } = splitFocus(spec);
  const source = resolve(path);
  if (!existsSync(source)) fail(`source image not found: ${path}`);
  if (/\.(heic|heif)$/i.test(source)) {
    fail(`${basename(source)} is HEIC, which sharp cannot read. Export it as JPEG first ` +
      '(on a Mac: open in Preview, File > Export, Format: JPEG).');
  }
  const shape = index === 0 ? 'hero' : 'gallery';
  const outName = index === 0 ? `${id}-hero.jpg` : `${id}-${index}.jpg`;
  return { source, position, shape, outName, out: join(IMAGES_DIR, outName) };
});

/* Read every source before writing any output. */
for (const job of jobs) {
  const image = sharp(job.source, { failOn: 'error' });
  try {
    job.meta = await image.metadata();
  } catch (err) {
    fail(`could not read ${basename(job.source)}: ${err.message}`);
  }
  /* metadata() reports the dimensions as stored; a phone portrait is usually
     stored landscape with an EXIF orientation telling the viewer to turn it.
     autoOrient is what those pixels become once .rotate() applies that tag, so
     it is what the sizes below should be compared against. */
  const oriented = job.meta.autoOrient ?? job.meta;
  job.srcW = oriented.width;
  job.srcH = oriented.height;
}

mkdirSync(IMAGES_DIR, { recursive: true });

for (const job of jobs) {
  const { w, h, quality } = SHAPES[job.shape];
  await sharp(job.source)
    .rotate()
    .resize(w, h, { fit: 'cover', position: job.position, withoutEnlargement: false })
    .jpeg({ quality, progressive: true, mozjpeg: true })
    .toFile(job.out);

  const kb = (statSync(job.out).size / 1024).toFixed(0);
  const srcRatio = (job.srcW / job.srcH).toFixed(2);
  const outRatio = (w / h).toFixed(2);
  const note = srcRatio === outRatio ? '' : `  (cropped from ${srcRatio}:1, focus: ${job.position})`;
  console.log(
    `${job.shape.padEnd(7)} ${basename(job.source)}  ${job.srcW}x${job.srcH} -> ` +
    `images/${job.outName}  ${w}x${h}, ${kb} KB${note}`
  );
  if (job.srcW < w || job.srcH < h) {
    console.log(`        warning: source is smaller than ${w}x${h} and was upscaled — it will look soft`);
  }
}

const gallery = jobs.slice(1).map((j) => `"images/${j.outName}"`).join(', ');
console.log(`
Now wire it into the "${id}" listing in site/directory-data.js:

      "heroPhoto": "images/${jobs[0].outName}",
      "photoCredit": "<who took it>",
      "gallery": [${gallery}]

then run: node scripts/validate-data.mjs`);
