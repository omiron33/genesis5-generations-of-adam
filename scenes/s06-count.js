// s06-count: "Maleleel begot Jared, / and Jared begot Enoch. / Then came the old refrain, / the house
// of man, the count of days. / Mathusala rose from Enoch, / and Lamech from Mathusala, / and still the
// ground held its burden / beneath every foot that walked."
// Deep night under a high moon, the stars wheeling slowly overhead (the count of days). We walk on up
// the road past JARED, ENOCH, MATHUSALA and LAMECH, each lamp catching as its name is sung, and the
// last two lines are pressed into the dust of the road ahead, worn by every foot that walked it.
import lyrics from '/timing.js';
import { track } from '/song/lib/cam.js';
import { valleyScene, stone, roadX, groundY } from '/song/lib/x-valley.js';
import { SKIES, grade, FINISH } from '/song/lib/look.js';
import { inscribe, anchorAt, wrap, wordOf } from '/song/lib/type.js';
import { spring } from '/kit/motion.js';
export const kind = 'shader';

export default (P) => {
  const A = anchorAt(lyrics, P.from, 'Maleleel begot Jared', 'and Jared begot Enoch', 'Then came the old', 'the house of man', 'Mathusala rose', 'and Lamech from', 'and still the ground', 'beneath every foot');
  const L = A.lines;
  const s = [5, 6, 7, 8].map(stone);
  const at = (st, d, side = 0, y = 0) => [st.face[0] + st.n[0] * d - st.n[2] * side, st.face[1] + 0.2 + y, st.face[2] + st.n[2] * d + st.n[0] * side];
  const on = (st, y = 0) => [st.face[0], st.face[1] - 0.25 + y, st.face[2]];
  // the dust lines lie across the road a little beyond LAMECH
  const GZ = s[3].z + 9, GX = roadX(GZ);
  const g = (x, z) => [x, groundY(x, z), z];
  const cam = track([
    { t: P.from, pos: at(s[0], 5.5, -1.8, -0.3), look: on(s[0], -0.3) },
    { t: L[0].start + 1.0, pos: at(s[0], 3.3, -0.2), look: on(s[0]) },
    { t: L[1].start - 0.4, pos: at(s[0], 2.9, 0.5), look: on(s[0], -0.05) },
    { t: L[1].start + 1.2, pos: at(s[1], 3.6, -0.6), look: on(s[1], 0.1) },
    { t: L[4].start - 0.6, pos: at(s[1], 2.8, 0.5), look: on(s[1], -0.05) },
    { t: L[4].start + 0.6, pos: at(s[2], 3.5, -0.5), look: on(s[2], 0.05) },
    { t: L[5].start - 0.5, pos: at(s[2], 3.0, 0.3), look: on(s[2], 0.0) },
    { t: L[5].start + 0.7, pos: at(s[3], 3.5, -0.4), look: on(s[3], 0.05) },
    { t: L[6].start - 0.5, pos: at(s[3], 3.0, 0.4), look: on(s[3], 0.0) },
    { t: L[6].start + 1.0, pos: [GX + 0.3, groundY(GX, GZ) + 1.55, GZ - 2.6], look: g(GX, GZ + 1.2) },
    { t: P.to, pos: [GX + 0.15, groundY(GX, GZ) + 1.45, GZ - 1.6], look: g(GX - 0.1, GZ + 2.2) },
  ], { handheld: { amount: 0.9, seed: 91 }, fov: 46, aperture: 0.004 });
  const names = ['JARED', 'ENOCH', 'MATHUSALA', 'LAMECH'];
  const nameWord = [wordOf([L[0]], /^Jared/), wordOf([L[1]], /^Enoch/), wordOf([L[4]], /^Mathusala/), wordOf([L[5]], /^Lamech/)];
  const text = [wrap([L[0]], 30), wrap([L[1], L[2], L[3]], 30), wrap([L[4]], 30), wrap([L[5]], 30)];
  // the ground rect: across the road (x from right to left as you walk +z), 4 m along it
  const rect = [GX + 1.5, GZ - 0.2, GX - 1.5, GZ + 3.8];
  return valleyScene(P, {
    name: 's06-count', cam, cols: 5,
    sky: () => SKIES.night,
    spin: (t) => 0.03 * (t - P.from),
    slots: { 5: 0, 6: 1, 7: 2, 8: 3 },
    extraCols: [4],
    lamps: (t) => [1, 1, 1, 1, 1, ...nameWord.map((w) => (t < w.start ? 0 : 0.35 + 0.65 * spring(t, w.start, { freq: 1.5, damping: 0.55 }))), 0],
    uniforms: { uGroundRect: new Float32Array(rect), uGroundSlot: 4 },
    words(ctx, t, col, box) {
      if (col === 4) {
        const W = Math.abs(rect[2] - rect[0]), H = rect[3] - rect[1];
        ctx.save(); ctx.translate(4 * 1024, 0); ctx.scale(1, 2048 / (1024 * H / W));
        inscribe(ctx, t, [{ words: L[6].words }, { words: L[7].words }], { x: 30, y: 300, w: 964, h: 800 }, { size: 150, leading: 2.6, font: 'italic' });
        ctx.restore();
        return;
      }
      inscribe(ctx, t, [{ words: [{ ...nameWord[col], w: names[col] }] }], { x: box.x + 60, y: 120, w: box.w - 120, h: 300 }, { size: 210, font: 'caps', tracking: 0.05 });
      inscribe(ctx, t, text[col], { x: box.x + 70, y: 470, w: box.w - 140, h: 1500 }, { size: 92, leading: 1.32 });
    },
    post: () => grade({ exposure: 1.7 }),
    finish: () => FINISH,
  });
};
