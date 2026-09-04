#!/usr/bin/env node
/**
 * ADU-WEB-03 G13 — the `sharp` advisory acceptance stays valid.
 *
 * ## What this protects
 *
 * SECURITY.md accepted four High-severity libvips CVEs on one stated ground:
 * this site imports no `next/image` and ships no raster assets, so the image
 * pipeline never runs. It recorded a reversal condition — "the day any page
 * imports next/image, or any image file is added under public/ or src/" — and
 * **nothing checked it.**
 *
 * A visual redesign trips that condition by default. It brings a logo, a hero
 * image, an icon set and a favicon, and none of those would have failed
 * anything. Worse, two tests filter favicon requests out as noise, so adding one
 * changes no result in either direction.
 *
 * ## The rule
 *
 * If raster assets exist, or the image pipeline is imported, then `sharp` must
 * be at a version where those CVEs are fixed. Either condition alone is fine:
 * a modern sharp with no images is belt and braces, and no images with an old
 * sharp is the state this project shipped in for four checkpoints.
 *
 * ## Why SVG is excluded
 *
 * Verified, not assumed. `src/app/icon.svg` was added, built, and served: the
 * bytes are identical to the source and the content-type is `image/svg+xml`.
 * Next serves it directly and does not route it through sharp. If that ever
 * changes, this exclusion is wrong and SVG must join the list.
 *
 * Run: npm run check:assets   (also runs automatically before `npm run build`)
 */
import { readdirSync, readFileSync, statSync, existsSync } from 'node:fs';
import { join, dirname, extname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

/** The version at which the accepted libvips CVEs are fixed. */
const MIN_SHARP = '0.35.0';

/**
 * Formats sharp processes. SVG is deliberately absent — see the header.
 * `.gif` and `.tiff` are included because sharp handles them too, even though
 * neither is a format anybody would reach for here.
 */
const RASTER = new Set(['.png', '.jpg', '.jpeg', '.webp', '.avif', '.gif', '.tiff']);

/** Imports that pull in the image pipeline. */
const PIPELINE = [/from\s+['"]next\/image['"]/, /from\s+['"]next\/og['"]/, /require\(['"]next\/(image|og)['"]\)/];

const SKIP_DIRS = new Set(['node_modules', '.next', '.git']);

function walk(dir, acc = []) {
  let entries;
  try {
    entries = readdirSync(dir, { withFileTypes: true });
  } catch {
    return acc;
  }
  for (const e of entries) {
    if (SKIP_DIRS.has(e.name)) continue;
    const p = join(dir, e.name);
    if (e.isDirectory()) walk(p, acc);
    else if (statSync(p).isFile()) acc.push(p);
  }
  return acc;
}

const rel = (f) => f.slice(ROOT.length + 1).replace(/\\/g, '/');

/** Numeric compare, so 0.35.4 sorts above 0.34.5 rather than below it. */
function gte(a, b) {
  const pa = String(a).split('.').map((n) => parseInt(n, 10) || 0);
  const pb = String(b).split('.').map((n) => parseInt(n, 10) || 0);
  for (let i = 0; i < 3; i++) {
    if ((pa[i] ?? 0) > (pb[i] ?? 0)) return true;
    if ((pa[i] ?? 0) < (pb[i] ?? 0)) return false;
  }
  return true;
}

function installedSharp() {
  const manifest = join(ROOT, 'node_modules/sharp/package.json');
  if (!existsSync(manifest)) return null;
  try {
    return JSON.parse(readFileSync(manifest, 'utf8')).version ?? null;
  } catch {
    return null;
  }
}

/* ---------------------------------------------------------------- scanning */

const rasters = [];
for (const dir of ['public', 'src']) {
  for (const file of walk(join(ROOT, dir))) {
    if (RASTER.has(extname(file).toLowerCase())) rasters.push(rel(file));
  }
}

const pipelineImports = [];
for (const file of walk(join(ROOT, 'src'))) {
  if (!/\.(ts|tsx|js|jsx|mjs)$/.test(file)) continue;
  const body = readFileSync(file, 'utf8');
  if (PIPELINE.some((re) => re.test(body))) pipelineImports.push(rel(file));
}

const triggered = rasters.length > 0 || pipelineImports.length > 0;
const version = installedSharp();

if (!triggered) {
  console.log(
    `assets: no raster assets and no image pipeline import` +
      `${version ? ` (sharp ${version} present but unreachable)` : ''}`
  );
  process.exit(0);
}

// From here the acceptance condition in SECURITY.md has been tripped.
if (!version) {
  console.error(
    '\nassets: the image pipeline is now in use, but sharp is not installed.\n' +
      '        Next needs it to process images. Install it at >= ' + MIN_SHARP + '.\n'
  );
  process.exit(1);
}

if (!gte(version, MIN_SHARP)) {
  console.error('\nassets: the sharp advisory acceptance in SECURITY.md is no longer valid.\n');
  if (rasters.length) {
    console.error(`        raster assets present (${rasters.length}):`);
    for (const r of rasters.slice(0, 8)) console.error(`          ${r}`);
    if (rasters.length > 8) console.error(`          ... and ${rasters.length - 8} more`);
  }
  if (pipelineImports.length) {
    console.error(`        image pipeline imported by:`);
    for (const p of pipelineImports) console.error(`          ${p}`);
  }
  console.error(
    `\n        sharp is ${version}; the accepted libvips CVEs are fixed at ${MIN_SHARP}.\n` +
      `        SECURITY.md accepted four High-severity advisories on the ground that\n` +
      `        this pipeline never runs. It runs now.\n` +
      `\n        Fix: raise the sharp override in package.json to ^${MIN_SHARP} or later.\n`
  );
  process.exit(1);
}

console.log(
  `assets: image pipeline in use (${rasters.length} raster, ${pipelineImports.length} import) ` +
    `— sharp ${version} >= ${MIN_SHARP}, acceptance still valid`
);
