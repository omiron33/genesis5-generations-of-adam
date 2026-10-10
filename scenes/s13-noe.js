// s13-noe: the last chorus. "The generations of Adam / go on, go on, go on / The generations of Adam /
// and the dust keeps singing on / Noe / will lift the ache of ground / Noe / will bear the mercy down /
// Sons and daughters, / the line goes on"
// Sunrise floods the valley gold. Across the road from the last standing stone a broad boulder carries
// the chorus, cut and filling with light as it is sung. On "Noe" we turn to the newest stone, NOE, its
// lamp catching as his name is sung and his two lines cut beneath it; then we rise and draw back to
// look across the road into Lamech's field: the thorns are giving way to green shoots in the furrows
// round the resting plough, the ache of the ground lifted.
import lyrics from '/timing.js';
import { track } from '/song/lib/cam.js';
import { valleyScene, stone, roadX, groundY, surface, LEDGE_W, LEDGE_H } from '/song/lib/x-valley.js';
import { skyMix, grade, FINISH, smooth } from '/song/lib/look.js';
import { inscribe, anchorAt, wrap } from '/song/lib/type.js';
import { spring } from '/kit/motion.js';
export const kind = 'shader';

export default (P) => {
  const A = anchorAt(lyrics, P.from, 'The generations of Adam', 'go on, go on', 'The generations of Adam', 'and the dust keeps', 'Noe', 'will lift the ache', 'Noe', 'will bear the mercy', 'Sons and daughters', 'the line goes on');
  const L = A.lines;
  const s9 = stone(9);
  const LZ = s9.z - 3, LX = roadX(LZ) - 3.0, ly = groundY(LX, LZ);
  const at = (st, d, side = 0, y = 0) => [st.face[0] + st.n[0] * d - st.n[2] * side, st.face[1] + 0.2 + y, st.face[2] + st.n[2] * d + st.n[0] * side];
  const on = (st, y = 0) => [st.face[0], st.face[1] - 0.25 + y, st.face[2]];
  const noeT = L[4].start;
  const cam = track([
    { t: P.from, pos: [LX + 3.9, ly + 1.5, LZ - 1.8], look: [LX, ly + 0.6, LZ] },
    { t: L[3].start + 0.8, pos: [LX + 3.0, ly + 1.4, LZ + 0.4], look: [LX - 0.1, ly + 0.55, LZ] },
    { t: noeT + 0.9, pos: at(s9, 3.4, -0.5), look: on(s9, 0.1) },
    { t: L[8].start - 0.2, pos: at(s9, 3.0, 0.3), look: on(s9, 0.0) },
    { t: L[9].start + 1.5, pos: [s9.x - 4.0, s9.y + 3.6, s9.z - 2.0], look: [roadX(172) - 6.5, 0.2, 172] },
    { t: P.to, pos: [s9.x - 4.5, s9.y + 6.0, s9.z - 4.0], look: [roadX(166) - 7.5, 0.0, 166] },
  ], { handheld: { amount: 0.8, seed: 111 }, fov: 46, aperture: 0.003 });
  const chorus = [L[0], L[1], L[2], L[3], L[8], L[9]].map((l) => ({ words: l.words }));
  return valleyScene(P, {
    name: 's13-noe', cam, ink: 2.4, cols: 2,
    // grey before dawn through the opening chorus; the sun comes up with Noe's name
    sky: (t) => skyMix('predawn', 'sunrise', 0.12 + 0.88 * smooth((t - noeT + 0.3) / 5)),
    slots: { 9: 0 },
    extraCols: [1],
    lamps: (t) => [1, 1, 1, 1, 1, 1, 1, 1, 1, t < noeT ? 0 : 0.35 + 0.65 * spring(t, noeT, { freq: 1.5, damping: 0.55 })],
    uniforms: { uLedge: new Float32Array([LX, LZ, Math.PI / 2, 1]), uField: 1 },
    update(t, u) { u.uGreen.value = 0.85 * smooth((t - L[5].start) / 10); },
    words(ctx, t, col, box) {
      if (col === 1) { surface(ctx, 1, LEDGE_W, LEDGE_H, (c, b) => inscribe(c, t, chorus, { x: b.x + 40, y: b.y + 20, w: b.w - 80, h: b.h - 40 }, { size: 52, leading: 1.22, valign: 'middle' })); return; }
      inscribe(ctx, t, [{ words: [{ ...L[4].words[0], w: 'NOE' }] }], { x: box.x + 60, y: 120, w: box.w - 120, h: 300 }, { size: 250, font: 'caps', tracking: 0.12 });
      inscribe(ctx, t, wrap([L[5], L[7]], 30), { x: box.x + 70, y: 500, w: box.w - 140, h: 1400 }, { size: 100, leading: 1.4 });
    },
    post: (t) => grade({ exposure: 1.6 - 0.45 * smooth((t - noeT) / 5) }),
    finish: () => FINISH,
  });
};
