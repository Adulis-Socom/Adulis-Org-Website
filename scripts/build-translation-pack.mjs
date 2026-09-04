#!/usr/bin/env node
/**
 * Builds `docs/translation-pack/` — everything a translator needs besides the
 * strings themselves.
 *
 * ## Why this exists
 *
 * A translator handed 601 bare strings produces a round trip. The two questions
 * they cannot answer from a flat list are **where does this appear** and **how
 * much room is there**, and both are answerable from this repository:
 *
 *   context.md            route + element type for every key
 *   glossary-candidates.md  recurring terms, their frequency and their keys
 *   accent-pairs.md       the split headlines, shown as pairs
 *   length-sensitive.md   measured headroom at 360px, banded
 *
 * ⚠ It proposes **no Amharic**. Renderings are a founder and CMO decision, and
 * the point of the glossary file is that the decision is made once against
 * evidence rather than string by string.
 *
 * `length-sensitive.md` is generated separately by the QA suite, which is the
 * only thing that can measure a rendered container — see
 * `tests/qa/measure-lengths.spec.ts`. This script writes the other three and the
 * catalogue copy.
 *
 * Run: node scripts/build-translation-pack.mjs
 */
import { readFileSync, writeFileSync, mkdirSync, readdirSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, 'docs/translation-pack');
mkdirSync(OUT, { recursive: true });

const raw = readFileSync(join(ROOT, 'src/messages/en.json'), 'utf8');
const catalogue = JSON.parse(raw);

/** Every leaf, as `a.b.c[0].d` -> string. */
function leaves(node, path = '', acc = []) {
  if (node && typeof node === 'object' && !Array.isArray(node)) {
    for (const [k, v] of Object.entries(node)) leaves(v, path ? `${path}.${k}` : k, acc);
  } else if (Array.isArray(node)) {
    node.forEach((v, i) => leaves(v, `${path}[${i}]`, acc));
  } else {
    acc.push([path, String(node)]);
  }
  return acc;
}
const all = leaves(catalogue);

/* ------------------------------------------------------- namespace -> route */

/**
 * Read from the source rather than restated: each page calls
 * `getTranslations('<namespace>')`, and its route comes from ROUTES.
 */
function walkFiles(dir, acc = []) {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) walkFiles(p, acc);
    else if (statSync(p).isFile() && /\.tsx?$/.test(p)) acc.push(p);
  }
  return acc;
}

const routesSrc = readFileSync(join(ROOT, 'src/lib/routes.ts'), 'utf8');
const routeBlock = routesSrc.slice(routesSrc.indexOf('export const ROUTES'), routesSrc.indexOf('} as const'));
const ROUTES = Object.fromEntries(
  [...routeBlock.matchAll(/(\w+):\s*'([^']+)'/g)].map((m) => [m[1], m[2]])
);

/** namespace -> the routes whose page or components read it. */
const nsRoutes = {};
const files = walkFiles(join(ROOT, 'src'));
for (const file of files) {
  const body = readFileSync(file, 'utf8');
  const rel = file.slice(ROOT.length + 1).replace(/\\/g, '/');
  const namespaces = new Set(
    [...body.matchAll(/getTranslations\(\s*['"]([\w]+)['"]/g)].map((m) => m[1])
      .concat([...body.matchAll(/getTranslations\(\{[^}]*namespace:\s*['"](\w+)['"]/g)].map((m) => m[1]))
      .concat([...body.matchAll(/useTranslations\(\s*['"](\w+)['"]/g)].map((m) => m[1]))
  );
  let route = null;
  const page = rel.match(/^src\/app\/\[locale\]\/(.*)page\.tsx$/);
  if (page) {
    const seg = page[1].replace(/\/$/, '');
    route = seg === '' ? '/' : `/${seg}`;
    if (route.includes('[...rest]')) route = '(catch-all)';
  } else if (rel.endsWith('not-found.tsx')) route = '(404)';
  else if (rel.startsWith('src/components/')) route = `component:${rel.split('/').pop().replace('.tsx', '')}`;
  for (const ns of namespaces) {
    (nsRoutes[ns] ||= new Set()).add(route ?? rel);
  }
}

/* ------------------------------------------------------------ element type */

/**
 * The element a key renders into, inferred from its own name. Crude on purpose:
 * it is a hint for a translator, and a wrong hint on a handful of keys costs
 * less than no hint on six hundred. Anything unmatched is reported as `body`,
 * which is the safe default — a translator who treats a heading as body loses
 * emphasis; the reverse loses meaning.
 */
const TYPE_RULES = [
  [/(^|\.)pageTitle$/, 'meta — browser tab and search result title'],
  [/(^|\.)(heading|headingAccent|title)$/, 'heading'],
  [/(^|\.)sub$/, 'subheading / lede'],
  [/Heading$/, 'section heading'],
  [/(^|\.)(cta|submit|.*Cta|.*Link|home|continue)$/, 'button or link label'],
  [/errors\./, 'error message'],
  [/(^|\.)fields\./, 'form field label'],
  [/Placeholder$/, 'input placeholder'],
  [/Help$/, 'field help text'],
  [/(^|\.)sections\[\d+\]\.title$/, 'legal section title'],
  [/(^|\.)sections\[\d+\]\.body$/, 'legal section body'],
  [/(^|\.)label$/, 'label'],
  [/(^|\.)note$/, 'note / small print'],
  [/Undecided$/, 'UNDECIDED placeholder — renders as a flagged box'],
  [/(^|\.)q$/, 'FAQ question'],
  [/(^|\.)a$/, 'FAQ answer'],
  [/(^|\.)level$/, 'trust level name — see the glossary'],
  [/(^|\.)body$/, 'body'],
];
const elementType = (key) => {
  for (const [re, label] of TYPE_RULES) if (re.test(key)) return label;
  return 'body';
};

/* ------------------------------------------------------------- context.md */

const byNs = {};
for (const [key, value] of all) (byNs[key.split('.')[0]] ||= []).push([key, value]);

let ctx = `# Where every string appears

Generated by \`scripts/build-translation-pack.mjs\`. ${all.length} strings.

A translator rendering a button and a paragraph identically is the commonest
avoidable defect in localisation, and it happens when only the string is
supplied. Each row below gives the **route** the string appears on and the
**element** it renders into.

Element types are inferred from key names and are a hint, not a contract.
Where one looks wrong, the string itself is the authority.

⚠ Read this beside \`length-sensitive.md\`. This file says what a string *is*;
that one says how much room it has.

`;

for (const ns of Object.keys(byNs).sort((a, b) => byNs[b].length - byNs[a].length)) {
  const routes = [...(nsRoutes[ns] ?? new Set(['(shared)']))].sort();
  ctx += `\n## \`${ns}\` — ${byNs[ns].length} strings\n\n**Appears on:** ${routes.map((r) => `\`${r}\``).join(' · ')}\n\n`;
  ctx += `| Key | Element | English |\n|---|---|---|\n`;
  for (const [key, value] of byNs[ns]) {
    const short = value.length > 90 ? value.slice(0, 87) + '…' : value;
    ctx += `| \`${key}\` | ${elementType(key)} | ${short.replace(/\|/g, '\\|')} |\n`;
  }
}
writeFileSync(join(OUT, 'context.md'), ctx, 'utf8');

/* --------------------------------------------------- glossary-candidates.md */

const TERMS = [
  'New', 'Established', 'Trusted',
  'completed orders', 'verified', 'stock', 'handoff', 'claim', 'reservation',
  'waitlist', 'seller', 'buyer', 'storefront', 'receipt', 'cancellation', 'refund'
];

let gloss = `# Glossary candidates

Generated by \`scripts/build-translation-pack.mjs\`.

Terms that recur across the site, with how often each appears and where. **No
Amharic is proposed here** — the renderings are a founder and CMO decision, and
this file exists so that decision is made **once, against evidence**, rather
than string by string while translating.

The three trust levels matter most: they name something a seller earns, they
appear on several pages, and one term used consistently is worth more than a
better term used variably.

| Term | Occurrences | Namespaces | Why it recurs |
|---|---|---|---|
`;
const WHY = {
  New: 'A trust level a seller starts at',
  Established: 'A trust level a seller earns',
  Trusted: 'The top trust level',
  'completed orders': 'The counted fact behind a trust level',
  verified: 'What phone and ID checks establish — never a judgement about a person',
  stock: 'Availability, always with the time it was last confirmed',
  handoff: 'The moment goods pass from seller to buyer',
  claim: 'A buyer raising a problem after an order',
  reservation: 'A buyer holding an item before paying',
  waitlist: 'The seller signup — the only conversion on the site',
  seller: 'One of the two audiences',
  buyer: 'The other audience',
  storefront: "A seller's structured shop page",
  receipt: 'The bank transfer proof a buyer uploads',
  cancellation: 'A published statistic',
  refund: 'Handled by the seller, never by Adulis'
};
for (const term of TERMS) {
  const re = new RegExp(`\\b${term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'gi');
  const hits = all.filter(([, v]) => re.test(v));
  if (!hits.length) continue;
  const count = all.reduce((n, [, v]) => n + (v.match(re) || []).length, 0);
  const namespaces = [...new Set(hits.map(([k]) => k.split('.')[0]))].sort();
  gloss += `| **${term}** | ${count} in ${hits.length} strings | ${namespaces.map((n) => `\`${n}\``).join(', ')} | ${WHY[term] ?? ''} |\n`;
}

gloss += `\n## Where each term appears\n`;
for (const term of TERMS) {
  const re = new RegExp(`\\b${term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
  const hits = all.filter(([, v]) => re.test(v));
  if (!hits.length) continue;
  gloss += `\n### ${term} — ${hits.length} strings\n\n`;
  for (const [key] of hits.slice(0, 40)) gloss += `- \`${key}\`\n`;
  if (hits.length > 40) gloss += `- …and ${hits.length - 40} more\n`;
}
writeFileSync(join(OUT, 'glossary-candidates.md'), gloss, 'utf8');

/* -------------------------------------------------------- accent-pairs.md */

const accents = all.filter(([k]) => k.endsWith('.headingAccent'));
let acc = `# Split headlines — the accent pairs

Generated by \`scripts/build-translation-pack.mjs\`.

Three headlines are stored as **two strings**: a lead and an accent. On screen
they render as one sentence, with the accent in gold.

> **The accent is a phrase, not a position.** Choose the Amharic words that
> name the outcome in the Amharic sentence. Do **not** take the English
> phrase's position and apply it — word order differs, and the accent must land
> on the words that carry the meaning in Amharic, wherever they fall.

They join as \`heading + " " + headingAccent\`, in that order. **If Amharic word
order puts the outcome first, say so** — the component takes its parts in a
fixed order and would need changing, rather than the copy being bent to fit.

Two constraints on the phrase:

- It must name the **outcome** — what the reader is being offered — not the subject
- It should stay under roughly **half the rendered headline at 360px**. Measured
  on the English: see the shares below

| Route | Lead (\`heading\`) | Accent (\`headingAccent\`, in gold) | English share at 360px |
|---|---|---|---|
`;
const SHARES = { home: '30%', forSellers: '37%', forBuyers: '39%' };
for (const [key, value] of accents) {
  const ns = key.split('.')[0];
  const lead = all.find(([k]) => k === `${ns}.heading`)?.[1] ?? '(missing)';
  const routes = [...(nsRoutes[ns] ?? new Set(['?']))].filter((r) => r.startsWith('/'));
  acc += `| \`${routes[0] ?? ns}\` | ${lead} | **${value}** | ${SHARES[ns] ?? '—'} |\n`;
}
acc += `
## Headlines that are NOT split

Every other page has a single \`heading\` and no accent — nothing is gold on
them. Two are single-part by nature (*How Adulis works*, *Why we're building
Adulis*), and the evidentiary pages (Trust & Safety, Prohibited products, and
the four legal documents) carry no gold at all, by rule.

Do not introduce an accent where there is not one.
`;
writeFileSync(join(OUT, 'accent-pairs.md'), acc, 'utf8');

/* ------------------------------------------------------------- en.json copy */
writeFileSync(join(OUT, 'en.json'), raw, 'utf8');

console.log(`translation pack: ${all.length} strings`);
console.log(`  context.md              ${Object.keys(byNs).length} namespaces`);
console.log(`  glossary-candidates.md  ${TERMS.length} terms considered`);
console.log(`  accent-pairs.md         ${accents.length} pairs`);
console.log(`  en.json                 ${raw.length} bytes, verbatim`);
console.log(`  length-sensitive.md     generated by the QA suite — npm run qa -- tests/qa/measure-lengths.spec.ts`);
