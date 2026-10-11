// s04-homes: "and the years were long as lamp smoke / over the homes of the earth. / Sons and
// daughters, sons and daughters, / one after one, the name survives."
// Nightfall. Beside the road a broad boulder has a sloping face dressed smooth and the four lines are
// cut into it as they are sung. The camera rises from the face and draws back over it, and beyond the
// road the far slope of the valley is scattered with houses, their doorways lit by lamps, the smoke of
// their lamps and fires leaning off the roofs into the dusk.
import lyrics from '/timing.js';
import { track } from '/song/lib/cam.js';
import { valleyScene, roadX, groundY, surface, LEDGE_W, LEDGE_H } from '/song/lib/x-valley.js';
import { skyMix, grade, FINISH, smooth } from '/song/lib/look.js';
import { inscribe, anchorAt, wrap } from '/song/lib/type.js';
export const kind = 'shader';

export default (P) => {
  const A = anchorAt(lyrics, P.from, 'and the years were long', 'over the homes', 'Sons and daughters, sons', 'one after one');
  const L = A.lines;
  const LZ = 112, LX = roadX(LZ) - 3.0, gy = groundY(LX, LZ);
  // the face looks toward +x (the road); the camera stands on the road looking -x over it at the slope
  const cam = track([
    { t: P.from, pos: [LX + 3.4, gy + 1.15, LZ + 0.9], look: [LX - 0.2, gy + 0.6, LZ + 0.1] },
    { t: L[1].start + 0.4, pos: [LX + 3.1, gy + 1.4, LZ - 0.2], look: [LX - 0.4, gy + 0.62, LZ] },
    { t: L[2].start + 0.3, pos: [LX + 3.5, gy + 1.9, LZ - 0.6], look: [LX - 0.3, gy + 0.6, LZ + 0.05] },
    { t: L[3].start + 0.8, pos: [LX + 4.0, gy + 2.4, LZ - 1.0], look: [LX - 1.2, gy + 0.7, LZ + 0.3] },
    { t: P.to, pos: [LX + 4.5, gy + 2.9, LZ - 1.3], look: [LX - 2.2, gy + 0.9, LZ + 0.6] },
  ], { handheld: { amount: 0.8, seed: 81 }, fov: 46, aperture: 0.003 });
  const lines = wrap(L, 40);
  return valleyScene(P, {
    name: 's04-homes', cam, cols: 1,
    sky: (t) => skyMix('twilight', 'night', 0.1 + 0.25 * smooth((t - P.from) / (P.to - P.from))),
    slots: {},
    extraCols: [0],
    lamps: () => [1, 1, 1, 1, 1, 0, 0, 0, 0, 0],
    uniforms: { uLedge: new Float32Array([LX, LZ, Math.PI / 2, 0]), uHomes: 1 },
    words(ctx, t, col) {
      surface(ctx, 0, LEDGE_W, LEDGE_H, (c, b) => inscribe(c, t, lines, { x: b.x + 170, y: b.y + b.h * 0.2, w: b.w - 340, h: b.h * 0.58 }, { size: 42, leading: 1.5, valign: 'middle' }));
    },
    post: () => grade({ exposure: 1.7 }),
    finish: () => FINISH,
  });
};
