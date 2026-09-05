import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { test } from './fixtures';
import { allPages } from './helpers';

/**
 * Generates `docs/translation-pack/length-sensitive.md` — how much room each
 * rendered string actually has at 360px.
 *
 * ## Why this is the most useful file in the pack
 *
 * The translation brief asks the translator to *"flag it if a string runs
 * long."* **They cannot know which containers are tight.** Nothing in a flat
 * list of 601 strings says that a button label has 4% headroom and a paragraph
 * has 300%. So the request is unanswerable, and the answer arrives after
 * launch instead — as a layout bug in a language nobody on the team reads.
 *
 * This measures the slack and converts that request into a short list: *here
 * are the strings where length actually matters.*
 *
 * ## What "headroom" means here, and what it does not
 *
 * For each rendered string this compares the **width the text actually
 * occupies** against the width offered by **the nearest ancestor that
 * establishes one** — a block, grid, flex container or table cell. Headroom is
 * what remains.
 *
 * ⚠ Not the element's own box, and not merely the nearest block either. Most
 * text here sits in a shrink-to-fit box — an inline link, a flex item, a pill —
 * whose width *is* its text width, so measuring that reports 0% for everything.
 * Two passes were needed: the first measured the element (101 strings at
 * exactly 0%), the second stopped at the nearest block and still landed on flex
 * items, which shrink-wrap too. Both were caught by the same tell — a
 * suspiciously round number repeated across unrelated strings.
 *
 * ⚠ It is a proxy, and worth stating plainly:
 *
 * - A string that already wraps has its headroom measured on its longest line,
 *   so "0% headroom" on a paragraph means *this line is full*, not *this
 *   paragraph cannot grow*. Paragraphs grow downward and the page is built for
 *   that. The band that matters is single-line elements — buttons, labels,
 *   chips, nav items — where growth has nowhere to go but overflow.
 * - It measures English. Amharic glyphs are wider at the same point size, so
 *   real headroom is smaller than this reports. Treat the bands as ordering,
 *   not as a budget.
 *
 * Both caveats are in the generated file, because the translator reads that and
 * not this.
 *
 * Run: npm run qa -- tests/qa/measure-lengths.spec.ts --project=chromium
 */
const OUT = join(__dirname, '..', '..', 'docs', 'translation-pack');
const CATALOGUE = join(__dirname, '..', '..', 'src', 'messages', 'en.json');

type Row = {
  text: string;
  route: string;
  tag: string;
  cls: string;
  singleLine: boolean;
  textWidth: number;
  available: number;
  headroom: number;
};

test('measure length sensitivity at 360px', async ({ page }) => {
  test.setTimeout(600_000);

  // Every leaf string, so a measured element can be matched back to its key.
  const catalogue = JSON.parse(readFileSync(CATALOGUE, 'utf8')) as unknown;
  const leaves: [string, string][] = [];
  const walk = (node: unknown, path = ''): void => {
    if (node && typeof node === 'object' && !Array.isArray(node)) {
      for (const [k, v] of Object.entries(node)) walk(v, path ? `${path}.${k}` : k);
    } else if (Array.isArray(node)) {
      node.forEach((v, i) => walk(v, `${path}[${i}]`));
    } else if (typeof node === 'string') {
      leaves.push([path, node]);
    }
  };
  walk(catalogue);
  const keyOf = new Map(leaves.map(([k, v]) => [v.trim(), k]));

  const rows: Row[] = [];

  for (const p of allPages().filter((x) => x.locale === 'en')) {
    await page.setViewportSize({ width: 360, height: 640 });
    await page.goto(p.url, { waitUntil: 'networkidle' });

    const measured = await page.evaluate(() => {
      const out: Omit<Row, 'route'>[] = [];
      const els = Array.from(document.querySelectorAll<HTMLElement>('body *'));
      for (const el of els) {
        // Only elements whose text is their own, not inherited from children.
        const own = Array.from(el.childNodes)
          .filter((n) => n.nodeType === Node.TEXT_NODE)
          .map((n) => n.textContent ?? '')
          .join('')
          .trim();
        if (!own || own.length < 2) continue;

        const style = getComputedStyle(el);
        if (style.display === 'none' || style.visibility === 'hidden') continue;
        const rect = el.getBoundingClientRect();
        if (rect.width === 0 || rect.right < 0) continue;

        // Screen-reader-only elements are clipped to 1px until focused.
        // Measuring one reports a 1px container and a nonsense ratio.
        const clipped =
          (style.clipPath !== 'none' && style.clipPath !== '') ||
          style.clip !== 'auto' ||
          rect.width <= 1;
        if (clipped) continue;

        // The width the text actually occupies, per rendered line.
        const range = document.createRange();
        range.selectNodeContents(el);
        const lines = Array.from(range.getClientRects()).filter((r) => r.width > 0);
        if (!lines.length) continue;
        const textWidth = Math.max(...lines.map((r) => r.width));

        // ⚠ NOT the element's own box. Most text here sits in a shrink-to-fit
        // element — an inline link, a flex item, a pill — whose width IS its
        // text width, so measuring it reports 0% headroom for everything and
        // means nothing. The first version of this file did exactly that and
        // produced 101 strings at precisely 0%, which is what gave it away.
        //
        // The real constraint is the nearest ancestor that establishes a width:
        // a block, a grid or flex container, or a table cell. That is the box
        // the text has to grow into.
        // Walk up to the first box whose width is NOT set by its own content.
        // Two things size to content and must both be walked past:
        //   - inline and inline-* boxes
        //   - flex and grid ITEMS, whatever their own display is — a
        //     `list-item` inside a `flex` row still shrink-wraps
        // The first box in normal block flow is the one the text has to fit.
        const SELF_SIZED = /^(block|flow-root|list-item|table-cell)$/;
        const PARENT_SIZES = /^(flex|inline-flex|grid|inline-grid)$/;
        let holder: HTMLElement | null = el;
        while (holder) {
          const d = getComputedStyle(holder).display;
          const parent: HTMLElement | null = holder.parentElement;
          const pd = parent ? getComputedStyle(parent).display : 'block';
          if (SELF_SIZED.test(d) && !PARENT_SIZES.test(pd)) break;
          holder = parent;
        }
        if (!holder) continue;
        const hs = getComputedStyle(holder);
        const hrect = holder.getBoundingClientRect();
        const available =
          hrect.width - parseFloat(hs.paddingLeft || '0') - parseFloat(hs.paddingRight || '0');
        if (available <= 0) continue;

        out.push({
          text: own,
          tag: el.tagName.toLowerCase(),
          cls: (typeof holder.className === 'string' ? holder.className : '')
            .split(/\s+/)
            .slice(0, 2)
            .join(' '),
          singleLine: lines.length === 1,
          textWidth: Math.round(textWidth),
          available: Math.round(available),
          headroom: Math.round(((available - textWidth) / available) * 100)
        });
      }
      return out;
    });

    for (const m of measured) rows.push({ ...m, route: p.url });
  }

  // One row per string: the tightest place it appears.
  const tightest = new Map<string, Row>();
  for (const r of rows) {
    const prev = tightest.get(r.text);
    if (!prev || r.headroom < prev.headroom) tightest.set(r.text, r);
  }

  const known = [...tightest.values()]
    .map((r) => ({ ...r, key: keyOf.get(r.text) }))
    .filter((r) => r.key)
    .sort((a, b) => a.headroom - b.headroom);

  const tight = known.filter((r) => r.headroom < 15);
  const normal = known.filter((r) => r.headroom >= 15 && r.headroom <= 60);
  const roomy = known.filter((r) => r.headroom > 60);
  const tightSingle = tight.filter((r) => r.singleLine);

  const row = (r: (typeof known)[number]) =>
    `| \`${r.key}\` | ${r.headroom}% | ${r.singleLine ? '**single line**' : 'wraps'} | \`${r.route}\` | ${r.textWidth}/${r.available}px | ${r.text.length > 60 ? r.text.slice(0, 57) + '…' : r.text} |\n`;

  let md = `# Length sensitivity — measured at 360px

Generated by \`tests/qa/measure-lengths.spec.ts\` against the built site.
${known.length} strings matched to a rendered element.

The brief asks you to *"flag it if a string runs long."* You cannot know which
containers are tight, so this file answers that instead: **here are the strings
where length actually matters.**

## How to read it

**Headroom** is the space left in a string's container on its widest rendered
line — \`(container − text) ÷ container\`. Measured at 360px, the narrowest
viewport the site supports, in the tightest place each string appears.

⚠ **Two caveats, both important:**

1. **A wrapping paragraph with 0% headroom is not in trouble.** Its longest
   line is simply full; paragraphs grow downward and every container on this
   site is built to let them. The rows that matter are marked **single line** —
   buttons, labels, chips, nav items — where growth has nowhere to go.
2. **This measures English.** Ge'ez is wider at the same point size, so real
   headroom is smaller than shown. Use the bands as an ordering, not a budget.

| Band | Count | Meaning |
|---|---|---|
| Under 15% | ${tight.length} (${tightSingle.length} single-line) | **Tight.** Length matters here |
| 15–60% | ${normal.length} | Normal |
| Over 60% | ${roomy.length} | Length is not a constraint |

---

## The list that matters — ${tightSingle.length} single-line strings under 15% headroom

These are the ones to write short. Everything else on the site can absorb the
usual Amharic expansion; these cannot, because they have nowhere to grow.

| Key | Headroom | | Route | Text/container | English |
|---|---|---|---|---|---|
`;
  for (const r of tightSingle) md += row(r);

  md += `\n---\n\n## Also under 15%, but wrapping — ${tight.length - tightSingle.length} strings\n\nThese have a full line, not a full container. They grow downward. Listed for\ncompleteness; **do not compress them** unless the layout list from the Amharic\nrehearsal names them.\n\n| Key | Headroom | | Route | Text/container | English |\n|---|---|---|---|---|---|\n`;
  for (const r of tight.filter((r) => !r.singleLine)) md += row(r);

  md += `\n---\n\n## Everything else\n\n${normal.length} strings have 15–60% headroom and ${roomy.length} have more than 60%.\nWrite those naturally; the layouts absorb them.\n\n### Strings not measured\n\n${known.length} of ${leaves.length} catalogue strings were matched to a rendered\nelement. The remainder are not rendered on a static page load — error messages,\nsuccess states, the deletion flow's later steps and the mobile menu — so they\nhave no measured container here. Treat them as normal unless the brief says\notherwise; the error messages in particular sit in a full-width block.\n`;

  mkdirSync(OUT, { recursive: true });
  writeFileSync(join(OUT, 'length-sensitive.md'), md, 'utf8');

  console.log(
    `LENGTHS matched=${known.length} tight=${tight.length} tightSingleLine=${tightSingle.length} normal=${normal.length} roomy=${roomy.length}`
  );
});
