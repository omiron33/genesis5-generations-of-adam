// Typography for words cut into the world. Words are drawn into the scene's text canvas, which the
// world's shader reads as an inscription (cut into stone, clay, wood or earth and filled with light).
// A word does not exist until it is sung: it is cut and fills with a bright light on its measured
// onset, then cools to a steady warm glow that stays for the rest of the shot.
const clamp01 = (x) => Math.min(1, Math.max(0, x));

// how alive a word is at time t: 0 before it is sung, a flash on the onset, then a steady glow
export function ignite(w, t, { lead = 0.04, rise = 0.16, cool = 0.9 } = {}) {
  const k = (t - (w.start - lead)) / rise;
  if (k <= 0) return { a: 0, heat: 0 };
  const a = clamp01(k);
  const after = Math.max(0, t - w.start);
  const heat = a * (0.62 + 0.38 * Math.exp(-after / cool));
  return { a: a * a * (3 - 2 * a), heat };
}

// colour of a word's light from its heat: white-gold when fresh, warm amber as it settles
export function heatColor(heat, tint = [255, 196, 120]) {
  const hot = [255, 240, 214];
  const k = clamp01((heat - 0.62) / 0.38);
  const c = tint.map((v, i) => Math.round(v + (hot[i] - v) * k));
  return `rgb(${c[0]},${c[1]},${c[2]})`;
}

export const FONTS = {
  name: (px) => `600 ${px}px "EB Garamond"`,
  line: (px) => `500 ${px}px "EB Garamond"`,
  italic: (px) => `italic 500 ${px}px "EB Garamond"`,
  caps: (px) => `700 ${px}px "EB Garamond"`,
};

// Lay out lines of words in a box of the canvas and draw each as it is sung.
//   lines: [{ words: [{ w, start, end }] }]  (from anchor() in /timing.js)
//   box: { x, y, w, h } in canvas pixels; align: 'center' | 'left'
//   size: font size in px (shrunk to fit the box width); leading: line spacing in sizes
//   font: FONTS key; caps: draw in capitals; tracking: letter spacing in ems (caps titles)
export function inscribe(ctx, t, lines, box, o = {}) {
  const { align = 'center', leading = 1.22, font = 'line', caps = false, tint, tracking = 0, minAlpha = 0, lead, valign = 'top', fade } = o;
  let size = o.size ?? 120;
  const text = (w) => (caps ? w.toUpperCase() : w);
  const f = FONTS[font];
  ctx.save();
  ctx.textBaseline = 'alphabetic';
  if (tracking) ctx.letterSpacing = `${(tracking * size).toFixed(1)}px`;
  ctx.font = f(size);
  // fit the widest line to the box
  const widthOf = (l) => l.words.reduce((s, w, i) => s + ctx.measureText(text(w.w) + (i < l.words.length - 1 ? ' ' : '')).width, 0);
  const widest = Math.max(...lines.map(widthOf));
  if (widest > box.w) { size = Math.floor(size * box.w / widest); ctx.font = f(size); if (tracking) ctx.letterSpacing = `${(tracking * size).toFixed(1)}px`; }
  const total = size * leading * (lines.length - 1) + size;
  let y = box.y + (valign === 'middle' ? (box.h - total) / 2 : 0) + size * 0.8;
  for (const l of lines) {
    const lw = widthOf(l);
    let x = align === 'center' ? box.x + (box.w - lw) / 2 : box.x;
    for (let i = 0; i < l.words.length; i++) {
      const w = l.words[i];
      const s = text(w.w) + (i < l.words.length - 1 ? ' ' : '');
      const g = ignite(w, t, lead !== undefined ? { lead } : {});
      const a = Math.max(minAlpha, g.a) * (fade ? fade(l, t) : 1);
      if (a > 0.001) {
        ctx.globalAlpha = a;
        ctx.fillStyle = heatColor(g.heat, tint);
        ctx.fillText(text(w.w), x, y);
      }
      x += ctx.measureText(s).width;
    }
    y += size * leading;
  }
  ctx.restore();
  return size;
}

// A title that is not sung (the chapter title before the vocals): it burns in over [t0, t0 + dur].
export function title(ctx, t, str, x, y, { t0, dur = 1.2, size = 200, font = 'caps', tracking = 0.12, tint, align = 'center' } = {}) {
  const k = clamp01((t - t0) / dur);
  if (k <= 0) return;
  ctx.save();
  ctx.font = FONTS[font](size);
  if (tracking) ctx.letterSpacing = `${(tracking * size).toFixed(1)}px`;
  ctx.textAlign = align;
  ctx.textBaseline = 'alphabetic';
  ctx.globalAlpha = k * k * (3 - 2 * k);
  ctx.fillStyle = heatColor(0.62 + 0.38 * Math.exp(-Math.max(0, t - t0 - dur) / 1.2) * k, tint);
  ctx.fillText(str, x, y);
  ctx.restore();
}

// Words of a line as { words } for inscribe, from a measured line (anchor() result line)
export const asLines = (...ls) => ls.map((l) => ({ words: l.words }));

// Break measured lines into rows of at most maxChars characters (words keep their timing).
export function wrap(lines, maxChars = 26) {
  const out = [];
  for (const l of lines) {
    let row = [], n = 0;
    for (const w of l.words) {
      if (row.length && n + w.w.length + 1 > maxChars) { out.push({ words: row }); row = []; n = 0; }
      row.push(w); n += w.w.length + 1;
    }
    if (row.length) out.push({ words: row });
  }
  return out;
}
// the first word in these lines whose text matches (for a name heading that ignites when sung)
export function wordOf(lines, re) {
  for (const l of lines) for (const w of l.words) if (re.test(w.w)) return w;
  return null;
}

// Words set along a circle in the canvas (centre cx, cy, radius R in px), centred on angle a0
// (radians, 0 = up, clockwise), letters upright to the outside, each lit as it is sung.
export function arcText(ctx, t, words, cx, cy, R, a0, { size = 120, font = 'line', tint, caps = false } = {}) {
  ctx.save();
  ctx.font = FONTS[font](size);
  ctx.textBaseline = 'alphabetic';
  const txt = (w) => (caps ? w.toUpperCase() : w);
  const glyphs = [];
  words.forEach((w, i) => { for (const ch of txt(w.w)) glyphs.push({ ch, w }); if (i < words.length - 1) glyphs.push({ ch: ' ', w }); });
  const widths = glyphs.map((g) => ctx.measureText(g.ch).width);
  const total = widths.reduce((a, b) => a + b, 0);
  let a = a0 - total / R / 2;
  glyphs.forEach((g, i) => {
    const am = a + widths[i] / R / 2;
    const s = ignite(g.w, t);
    if (s.a > 0.001 && g.ch !== ' ') {
      ctx.save();
      ctx.translate(cx + R * Math.sin(am), cy - R * Math.cos(am));
      ctx.rotate(am);
      ctx.globalAlpha = s.a; ctx.fillStyle = heatColor(s.heat, tint);
      ctx.fillText(g.ch, -widths[i] / 2, 0);
      ctx.restore();
    }
    a += widths[i] / R;
  });
  ctx.restore();
}

// Like anchor() from /timing.js, but searching from song time t0 (a chorus that repeats).
export function anchorAt(lyrics, t0, ...prefixes) {
  const norm = (s) => s.toLowerCase().replace(/[’']/g, "'").replace(/[^a-z' ]/g, '').trim();
  let prev = -1;
  const lines = prefixes.map((p) => {
    const l = lyrics.lines.find((l) => (prev < 0 ? l.start >= t0 - 0.5 : l.start > prev) && norm(l.text).startsWith(norm(p)));
    if (!l) throw Error('no line: ' + p + ' after ' + prev);
    prev = l.start;
    const words = lyrics.words.filter((w) => w.start >= l.start - 0.05 && w.end <= l.end + 0.05);
    return { ...l, words };
  });
  return { lines };
}
