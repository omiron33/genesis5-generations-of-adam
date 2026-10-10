// s00-title: the instrumental opening and "When the earth was new to man, / and the image of God
// was in his hands..."
// Darkness in the hall of lamps. A flint strikes: sparks spray off the first clay lamp's wick and
// it catches. The camera, already moving, draws back from the new flame along a low arc, and the
// light climbs the chisel-marked wall: GENESIS 5, THE GENERATIONS OF ADAM, cut into the rock,
// fill with fire. Drifting on along the wall, the two opening lines are cut beneath as they are sung.
import { track } from '/song/lib/cam.js';
import { anchor } from '/timing.js';
import { hallScene, wick } from '/song/lib/x-hall.js';
import { grade, FINISH, smooth, clamp01 } from '/song/lib/look.js';
import { inscribe, title } from '/song/lib/type.js';
import { spring } from '/kit/motion.js';
export const kind = 'shader';

const STRIKE = 0.12;
export default (P) => {
  const I = anchor('When the earth', 'and the image of God');
  const w0 = wick(0);
  // wall text band: x -0.9..2.1, y 1.12..2.42 on the back wall
  const rect = [-0.9, 1.12, 2.1, 2.42];
  const PX = 1024;
  const size = [Math.round((rect[2] - rect[0]) * PX), Math.round((rect[3] - rect[1]) * PX)];
  const wx = (x) => (x - rect[0]) * PX, wy = (y) => (rect[3] - y) * PX;
  const cam = track([
    { t: P.from, pos: [w0[0] + 0.16, w0[1] + 0.04, w0[2] + 0.34], look: [w0[0], w0[1] + 0.02, w0[2]], fov: 34, focus: 0.36, aperture: 0.004 },
    { t: 2.2, pos: [w0[0] + 0.32, w0[1] + 0.14, w0[2] + 0.62], look: [w0[0] - 0.02, w0[1] + 0.12, w0[2] - 0.1], fov: 36, focus: 0.66, aperture: 0.004 },
    { t: 5.0, pos: [w0[0] + 0.6, 1.32, 1.85], look: [0.55, 1.78, 0.0], fov: 40, focus: 2.0, aperture: 0.006 },
    { t: 9.5, pos: [w0[0] + 0.35, 1.38, 2.25], look: [0.62, 1.66, 0.0], fov: 40, focus: 2.3, aperture: 0.006 },
    { t: 15.0, pos: [w0[0] + 0.05, 1.3, 2.05], look: [0.55, 1.46, 0.0], fov: 39, focus: 2.1, aperture: 0.006 },
    { t: P.to, pos: [w0[0] - 0.45, 1.22, 1.75], look: [0.52, 1.36, 0.0], fov: 38, focus: 1.8, aperture: 0.006 },
  ], { handheld: { amount: 0.5, seed: 11, metres: 0.6 } });
  return hallScene(P, {
    name: 's00-title', cam,
    // the flame catches with a flare and settles
    lit: (t) => [t < STRIKE + 0.12 ? 0.22 : 0.35 + 0.65 * spring(t, STRIKE + 0.12, { freq: 1.4, damping: 0.6 })],
    amb: [0.004, 0.0035, 0.004],
    text: {
      mode: 0, rect, size,
      draw(ctx, t) {
        title(ctx, t, 'GENESIS 5', wx(0.55), wy(2.12), { t0: 1.4, dur: 1.4, size: 230, tracking: 0.16 });
        title(ctx, t, 'THE GENERATIONS OF ADAM', wx(0.55), wy(1.86), { t0: 3.0, dur: 1.6, size: 108, tracking: 0.22, font: 'name' });
        inscribe(ctx, t, I.lines.map((l) => ({ words: l.words })), { x: wx(-0.55), y: wy(1.66), w: (1.1 + 0.55) * PX * 1.3, h: 400 }, { size: 86, leading: 1.45, font: 'italic' });
      },
    },
    extra: /* glsl */ `
#define HALL_EXTRA
vec3 hallExtra(vec3 ro, vec3 rd, float depth) {
  // the strike: a spray of flint sparks off the wick, falling and cooling
  float k = uTime - ${STRIKE.toFixed(2)};
  if (k < 0.0 || k > 1.4) return vec3(0.0);
  vec3 acc = vec3(0.0);
  vec3 w = vec3(${w0.map((v) => v.toFixed(4)).join(', ')});
  for (int i = 0; i < 26; i++) {
    float fi = float(i);
    vec3 v = (hash33(vec3(fi, 3.0, 7.0)) - vec3(0.5, 0.1, 0.5)) * vec3(1.4, 1.1, 1.4);
    float life = 0.35 + 0.7 * hash11(fi * 5.1);
    float kk = k - 0.03 * hash11(fi * 2.7);
    if (kk < 0.0 || kk > life) continue;
    vec3 p = w + v * kk + vec3(0.0, -2.2 * kk * kk, 0.0);
    float T = 1.0 - kk / life;
    vec3 oc = p - ro; float tc = dot(oc, rd); if (tc > 0.0 && tc < depth) { float h2 = max(dot(oc, oc) - tc * tc, 0.0); acc += lifeHeat(T) * 0.6 * exp(-h2 / (0.00025 * 0.00025)); }
  }
  return acc;
}`,
    post: (t) => grade({ exposure: 1.1, bloom: 0.2 }),
    finish: () => FINISH,
  });
};
