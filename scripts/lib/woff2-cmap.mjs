/**
 * Reads the character map straight out of a .woff2 binary.
 *
 * ## Why this exists
 *
 * `check:font` used to compare the switcher label against the **manifest** that
 * sits beside the font, and confirm the font's hash matched that manifest. That
 * proves the manifest and the file belong together. It does not prove the *font*
 * contains the glyphs.
 *
 * If the subsetting request ever returned a font missing a codepoint, the
 * manifest — written from the same response — would claim coverage anyway and
 * the check would pass. The switcher would render a missing-glyph box and every
 * automated check would stay green. That is exactly the class of failure the
 * U+123B/U+129B mix-up already demonstrated once.
 *
 * So the check now reads the `cmap` table and asserts real coverage.
 *
 * ## Format notes
 *
 * WOFF2 is a table directory followed by one Brotli stream containing every
 * table concatenated in directory order. Only `glyf` and `loca` are ever
 * transformed, so `cmap` is found by summing the preceding tables' lengths.
 *
 * Both cmap subtable formats that matter are handled: format 4 (BMP, what a
 * small Latin/Ethiopic subset normally gets) and format 12 (full Unicode). A
 * codepoint counts as covered only when it maps to a **non-zero** glyph id —
 * mapping to glyph 0 is `.notdef`, which is the box this check exists to prevent.
 */
import { brotliDecompressSync } from 'node:zlib';

/** WOFF2 known-table tags, indexed by the 6-bit code in each directory entry. */
const KNOWN_TAGS = [
  'cmap', 'head', 'hhea', 'hmtx', 'maxp', 'name', 'OS/2', 'post',
  'cvt ', 'fpgm', 'glyf', 'loca', 'prep', 'CFF ', 'VORG', 'EBDT',
  'EBLC', 'gasp', 'hdmx', 'kern', 'LTSH', 'PCLT', 'VDMX', 'vhea',
  'vmtx', 'BASE', 'GDEF', 'GPOS', 'GSUB', 'EBSC', 'JSTF', 'MATH',
  'CBDT', 'CBLC', 'COLR', 'CPAL', 'SVG ', 'sbix', 'acnt', 'avar',
  'bdat', 'bloc', 'bsln', 'cvar', 'fdsc', 'feat', 'fmtx', 'fvar',
  'gvar', 'hsty', 'just', 'lcar', 'mort', 'morx', 'opbd', 'prop',
  'trak', 'Zapf', 'Silf', 'Glat', 'Gloc', 'Feat', 'Sill'
];

/** The variable-length integer WOFF2 uses for table lengths. */
function readBase128(buf, pos) {
  let value = 0;
  for (let i = 0; i < 5; i++) {
    const byte = buf[pos++];
    if (byte === undefined) throw new Error('UIntBase128 ran past end of buffer');
    if (i === 0 && byte === 0x80) throw new Error('UIntBase128 has a leading zero');
    if (value & 0xfe000000) throw new Error('UIntBase128 overflow');
    value = (value << 7) | (byte & 0x7f);
    if ((byte & 0x80) === 0) return [value >>> 0, pos];
  }
  throw new Error('UIntBase128 longer than 5 bytes');
}

/** Locate and decompress the cmap table. */
function extractCmap(woff2) {
  if (woff2.readUInt32BE(0) !== 0x774f4632) throw new Error('not a WOFF2 file (bad signature)');
  const numTables = woff2.readUInt16BE(12);

  let pos = 48;
  const directory = [];
  for (let i = 0; i < numTables; i++) {
    const flags = woff2[pos++];
    const tagIndex = flags & 0x3f;
    let tag;
    if (tagIndex === 63) {
      tag = woff2.toString('latin1', pos, pos + 4);
      pos += 4;
    } else {
      tag = KNOWN_TAGS[tagIndex];
      if (!tag) throw new Error(`unknown table tag index ${tagIndex}`);
    }

    let origLength;
    [origLength, pos] = readBase128(woff2, pos);

    // Only glyf and loca are ever transformed. For them, version 3 means the
    // null transform; anything else carries a transformLength. For every other
    // table, a non-zero version carries one.
    const version = (flags >> 6) & 0x03;
    const transformed = tag === 'glyf' || tag === 'loca' ? version !== 3 : version !== 0;
    let length = origLength;
    if (transformed) [length, pos] = readBase128(woff2, pos);

    directory.push({ tag, length });
  }

  const font = brotliDecompressSync(woff2.subarray(pos));

  let offset = 0;
  for (const entry of directory) {
    if (entry.tag === 'cmap') return font.subarray(offset, offset + entry.length);
    offset += entry.length;
  }
  throw new Error('no cmap table in font');
}

function parseFormat4(t, base) {
  const covered = new Set();
  const segCount = t.readUInt16BE(base + 6) / 2;
  const endBase = base + 14;
  const startBase = endBase + segCount * 2 + 2;
  const deltaBase = startBase + segCount * 2;
  const rangeBase = deltaBase + segCount * 2;

  for (let s = 0; s < segCount; s++) {
    const end = t.readUInt16BE(endBase + s * 2);
    const start = t.readUInt16BE(startBase + s * 2);
    if (start > end) continue;
    const delta = t.readInt16BE(deltaBase + s * 2);
    const rangeOffset = t.readUInt16BE(rangeBase + s * 2);

    for (let cp = start; cp <= end && cp !== 0xffff; cp++) {
      let glyph;
      if (rangeOffset === 0) {
        glyph = (cp + delta) & 0xffff;
      } else {
        const gi = rangeBase + s * 2 + rangeOffset + (cp - start) * 2;
        if (gi + 1 >= t.length) continue;
        glyph = t.readUInt16BE(gi);
        if (glyph !== 0) glyph = (glyph + delta) & 0xffff;
      }
      if (glyph !== 0) covered.add(cp);
    }
  }
  return covered;
}

function parseFormat12(t, base) {
  const covered = new Set();
  const nGroups = t.readUInt32BE(base + 12);
  for (let g = 0; g < nGroups; g++) {
    const o = base + 16 + g * 12;
    const start = t.readUInt32BE(o);
    const end = t.readUInt32BE(o + 4);
    const startGlyph = t.readUInt32BE(o + 8);
    for (let cp = start; cp <= end; cp++) {
      if (startGlyph + (cp - start) !== 0) covered.add(cp);
    }
  }
  return covered;
}

/** Every codepoint the font actually maps to a real glyph. */
export function coveredCodepoints(woff2Buffer) {
  const cmap = extractCmap(woff2Buffer);
  const numTables = cmap.readUInt16BE(2);

  const subtables = [];
  for (let i = 0; i < numTables; i++) {
    const rec = 4 + i * 8;
    subtables.push({
      platformID: cmap.readUInt16BE(rec),
      encodingID: cmap.readUInt16BE(rec + 2),
      offset: cmap.readUInt32BE(rec + 4)
    });
  }

  const covered = new Set();
  let parsed = 0;
  for (const sub of subtables) {
    // Unicode subtables only: platform 0 (Unicode) or platform 3 encodings 1/10.
    const isUnicode =
      sub.platformID === 0 || (sub.platformID === 3 && (sub.encodingID === 1 || sub.encodingID === 10));
    if (!isUnicode) continue;

    const format = cmap.readUInt16BE(sub.offset);
    if (format === 4) {
      for (const cp of parseFormat4(cmap, sub.offset)) covered.add(cp);
      parsed++;
    } else if (format === 12) {
      for (const cp of parseFormat12(cmap, sub.offset)) covered.add(cp);
      parsed++;
    }
  }

  if (parsed === 0) throw new Error('no format 4 or format 12 Unicode cmap subtable found');
  return covered;
}
