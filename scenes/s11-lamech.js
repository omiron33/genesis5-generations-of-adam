// s11-lamech: "Then back to earth, the names remain, / the lamps still burn, the hands still ache. /
// Mathusala, Lamech, the old road wide, / the promise moving under the weight. / Lamech looked on the
// cursed ground, / on the sweat and thorns and the wearied face, / and spoke of rest through
// trembling breath: / "From our toil, this one will bring us ease.""
// Back on earth in the grey before dawn after Enoch's ridge. The lamps along the valley still burn.
// Two lines are cut into a low boulder at the roadside between MATHUSALA's stone and LAMECH's; we pass
// LAMECH's stone, then turn off the road into his field: hard furrows, thorns crowding them, the
// wooden plough left lying at the end of a furrow. Lamech's words are pressed into the soil beside it.
import lyrics from '/timing.js';
import { track } from '/song/lib/cam.js';
import { valleyScene, stone, roadX, groundY, surface, LEDGE_W, LEDGE_H } from '/song/lib/x-valley.js';
import { skyMix, grade, FINISH, smooth } from '/song/lib/look.js';
import { inscribe, anchorAt, wrap } from '/song/lib/type.js';
export const kind = 'shader';

export default (P) => {
  const A = anchorAt(lyrics, P.from, 'Then back to earth', 'the lamps still burn', 'Mathusala, Lamech', 'the promise moving', 'Lamech looked on', 'on the sweat', 'and spoke of rest', 'From our toil');
  const L = A.lines;
  const s8 = stone(8);
  const LZ = 158, LX = roadX(LZ) - 2.6, ly = groundY(LX, LZ);
  // the field across the road from LAMECH: the plough lies at (roadX(170) - 6, 170)
  const PX = roadX(170) - 6, PZ = 170, py = groundY(PX, PZ);
  const at = (st, d, side = 0, y = 0) => [st.face[0] + st.n[0] * d - st.n[2] * side, st.face[1] + 0.2 + y, st.face[2] + st.n[2] * d + st.n[0] * side];
  const on = (st, y = 0) => [st.face[0], st.face[1] - 0.25 + y, st.face[2]];
  const cam = track([
    { t: P.from, pos: [LX + 3.6, ly + 1.4, LZ - 2.2], look: [LX, ly + 0.6, LZ] },
    { t: L[1].start + 1.5, pos: [LX + 3.0, ly + 1.35, LZ - 0.4], look: [LX - 0.1, ly + 0.55, LZ + 0.1] },
    { t: L[2].start + 0.8, pos: at(s8, 3.6, -0.6), look: on(s8, 0.1) },
    { t: L[3].start + 1.4, pos: at(s8, 3.0, 0.4), look: on(s8, 0.0) },
    { t: L[4].start + 1.2, pos: [PX + 4.0, py + 1.5, PZ - 5.0], look: [PX + 1.0, py + 0.1, PZ - 2.0] },
    { t: L[6].start + 0.5, pos: [PX + 2.8, py + 1.6, PZ - 6.2], look: [PX, py + 0.1, PZ - 2.0] },
    { t: P.to, pos: [PX + 1.6, py + 1.2, PZ - 3.9], look: [PX - 0.3, py + 0.5, PZ - 1.25] },
  ], { handheld: { amount: 0.9, seed: 101 }, fov: 46, aperture: 0.004 });
  // ground text beside the plough: 4 lines, across the field looking +z-ish; x right-to-left
  const rect = [PX + 2.6, PZ - 4.4, PX - 2.2, PZ - 0.6];
  return valleyScene(P, {
    name: 's11-lamech', cam, cols: 4,
    sky: (t) => ({ ...skyMix('predawn', 'twilight', 0.3), uSunDir: [0.55, 0.06, 0.83], uSunCol: [0.75, 0.55, 0.5], uCloud: 0.75 }),
    slots: { 7: 0, 8: 1 },
    extraCols: [2, 3],
    lamps: () => [1, 1, 1, 1, 1, 1, 1, 1, 1, 0],
    uniforms: { uLedge: new Float32Array([LX, LZ, Math.PI / 2, 2]), uField: 1, uToil: 1, uGroundRect: new Float32Array(rect), uGroundSlot: 3 },
    words(ctx, t, col, box) {
      if (col === 2) { surface(ctx, 2, LEDGE_W, LEDGE_H, (c, b) => inscribe(c, t, [{ words: L[0].words }, { words: L[1].words }], { x: b.x + 50, y: b.y + 40, w: b.w - 100, h: b.h - 80 }, { size: 72, leading: 1.5, valign: 'middle' })); return; }
      if (col === 3) {
        const W = Math.abs(rect[2] - rect[0]), H = rect[3] - rect[1];
        surface(ctx, 3, W, H, (c, b) => inscribe(c, t, L.slice(4).map((l) => ({ words: l.words })), { x: b.x + 30, y: b.y + 60, w: b.w - 60, h: b.h - 120 }, { size: 58, leading: 1.9, font: 'italic', valign: 'middle' }));
        return;
      }
      if (col === 0) { inscribe(ctx, t, [{ words: [{ start: P.from - 1, end: P.from, w: 'MATHUSALA' }] }], { x: box.x + 60, y: 120, w: box.w - 120, h: 300 }, { size: 210, font: 'caps' }); return; }
      inscribe(ctx, t, [{ words: [{ start: P.from - 1, end: P.from, w: 'LAMECH' }] }], { x: box.x + 60, y: 120, w: box.w - 120, h: 300 }, { size: 210, font: 'caps' });
      inscribe(ctx, t, wrap([L[2], L[3]], 30), { x: box.x + 70, y: 470, w: box.w - 140, h: 1500 }, { size: 92, leading: 1.32 });
    },
    post: () => grade({ exposure: 1.6 }),
    finish: () => FINISH,
  });
};
