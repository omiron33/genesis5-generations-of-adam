// s14-road-goes-on: "Noe begot Shem, / and Ham, / and Japheth. / The road goes on... / the road goes on..."
// The sun is up. Three lamps stand where three paths leave the road; each catches from NOE's lamp as
// its son's name is sung, Shem, Ham, Japheth, and then small lamps light one after another on along each
// path into the gold valley. Their names are pressed into the
// dust where each path leaves the road, and further up the road a last boulder bears "The road goes
// on". The camera rises slowly over it all until the road runs on into the morning.
import lyrics from '/timing.js';
import { track } from '/song/lib/cam.js';
import { valleyScene, stone, roadX, groundY, surface, LEDGE_W, LEDGE_H, lampWick } from '/song/lib/x-valley.js';
import { SKIES, grade, FINISH, smooth, clamp01 } from '/song/lib/look.js';
import { inscribe, anchorAt } from '/song/lib/type.js';
export const kind = 'shader';

export default (P) => {
  const A = anchorAt(lyrics, P.from, 'Noe begot Shem', 'and Ham', 'and Japheth', 'The road goes on', 'the road goes on');
  const L = A.lines;
  const s9 = stone(9);
  const Z0 = s9.z + 4, X0 = roadX(Z0);
  // three paths leave the road here: up the left slope, on up the road, up the right slope
  const paths = [
    (k) => { const z = Z0 + 34 * k, x = roadX(z) + 2 + 26 * k * k; return [x, groundY(x, z) + 0.75, z]; },
    (k) => { const z = Z0 + 60 * k, x = roadX(z) + 0.4; return [x, groundY(x, z) + 0.75, z]; },
    (k) => { const z = Z0 + 34 * k, x = roadX(z) - 1.6 - 28 * k * k; return [x, groundY(x, z) + 0.75, z]; },
  ];
  const leave = L.slice(0, 3).map((l) => l.start + 0.2);
  // a lamp at the head of each path catches from Noe's in the order of the names; then lamps light one
  // after another on along each path, the line going on
  const onGround = (p) => [p[0], p[1] - 0.7, p[2]];
  const walker = (i, t) => (t < leave[i] ? [0, -100, 0] : onGround(paths[i](0.012)));
  // a flame runs from Noe's lamp along a groove in the dust to each lamp, arriving as its name is sung
  const W9 = lampWick(9);
  const front = (i, t) => {
    const t0 = leave[i] - 1.7, k = (t - t0) / 1.7;
    if (k < 0 || k > 1.05) return [0, -100, 0];
    const e = paths[i](0.012), q = Math.min(1, k);
    const g = onGround(e); void g;
    return [W9[0] + (e[0] - W9[0]) * q, groundY(W9[0] + (e[0] - W9[0]) * q, W9[2] + (e[2] - W9[2]) * q) + 0.01, W9[2] + (e[2] - W9[2]) * q];
  };
  const glow = (i, j, t) => (t < leave[i] + 3 + j * 2.0 ? [0, -100, 0] : onGround(paths[i]((j + 1) / 9)));
  const RZ = Z0 + 6, RX = roadX(RZ) - 3.0, ry = groundY(RX, RZ);
  const rect = [X0 + 2.0, Z0 - 2.4, X0 - 2.0, Z0 + 0.6];
  const cam = track([
    { t: P.from, pos: [X0 - 0.5, groundY(X0, Z0) + 1.7, Z0 - 6.5], look: [X0, groundY(X0, Z0) + 0.2, Z0 - 0.5] },
    { t: L[2].start + 1.4, pos: [X0 - 0.3, groundY(X0, Z0) + 2.6, Z0 - 7.0], look: [X0, groundY(X0, Z0) + 0.2, Z0 + 0.5] },
    { t: L[3].start + 1.6, pos: [RX + 3.6, ry + 1.8, RZ - 3.0], look: [RX, ry + 0.6, RZ] },
    { t: L[4].start + 0.6, pos: [RX + 4.0, ry + 2.3, RZ - 3.6], look: [RX - 0.2, ry + 0.5, RZ + 0.2] },
    { t: L[4].start + 2.6, pos: [RX + 4.6, ry + 3.4, RZ - 5.0], look: [RX - 0.6, ry + 0.4, RZ + 1.5] },
    { t: L[4].start + 6.5, pos: [RX + 5.0, ry + 6.0, RZ - 8.0], look: [RX - 3.0, ry + 1.0, RZ + 20.0] },
    { t: P.to, pos: [RX + 6.0, ry + 16.0, RZ - 14.0], look: [roadX(RZ + 90), 4.0, RZ + 90] },
  ], { handheld: { amount: 0.7, seed: 121 }, fov: 46, aperture: 0.002 });
  return valleyScene(P, {
    name: 's14-road-goes-on', cam, ink: 0.7, cols: 2,
    sky: (t) => ({ ...SKIES.sunrise, uSunDir: [0.15, 0.13, 1.0], uSunCol: [3.0 - 1.2 * smooth((t - 262) / 12), 1.7 - 0.6 * smooth((t - 262) / 12), 0.85 - 0.25 * smooth((t - 262) / 12)] }),
    slots: {},
    extraCols: [0, 1],
    lamps: () => new Array(10).fill(1),
    uniforms: { uLedge: new Float32Array([RX, RZ, Math.PI / 2, 1]), uGroundRect: new Float32Array(rect), uGroundSlot: 0 },
    update(t, u) {
      for (let i = 0; i < 3; i++) {
        const w = walker(i, t); for (let j = 0; j < 3; j++) u.uWalkers.value[i * 3 + j] = w[j];
        const f = front(i, t); for (let j = 0; j < 3; j++) u.uFronts.value[i * 3 + j] = f[j];
        const e = onGround(paths[i](0.012)); for (let j = 0; j < 3; j++) u.uGrooves.value[i * 3 + j] = e[j];
        for (let k = 0; k < 8; k++) { const g = glow(i, k, t); for (let j = 0; j < 3; j++) u.uGlows.value[(i * 8 + k) * 3 + j] = g[j]; }
      }
    },
    words(ctx, t, col) {
      if (col === 1) { surface(ctx, 1, LEDGE_W, LEDGE_H, (c, b) => inscribe(c, t, [{ words: L[3].words, older: true }, { words: L[4].words }], { x: b.x + 50, y: b.y + 40, w: b.w - 100, h: b.h - 80 }, { size: 96, leading: 1.4, valign: 'middle', fade: (l, tt) => (l.older ? 1 - 0.55 * smooth((tt - L[4].start) / 0.8) : 1) })); return; }
      const W = Math.abs(rect[2] - rect[0]), H = rect[3] - rect[1];
      surface(ctx, 0, W, H, (c, b) => inscribe(c, t, L.slice(0, 3).map((l) => ({ words: l.words })), { x: b.x + 40, y: b.y + 40, w: b.w - 80, h: b.h - 80 }, { size: 150, leading: 1.4, font: 'italic', valign: 'middle' }));
    },
    post: (t) => grade({ exposure: 1.05 - 0.3 * smooth((t - 262) / 10), bloom: 0.08, threshold: 1.3 }),
    finish: () => FINISH,
  });
};
