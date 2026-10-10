// s01-adam: "Adam begot a son in his likeness ... and sons and daughters followed after."
// Dusk in the valley of names. We come up the road on foot to the first standing stone, ADAM, its
// lamp burning on the rock at its foot; his lines cut into the face fill with light as they are
// sung. Without stopping we walk on up the road to the second stone, SETH, as the cloud runs fast
// overhead (the days went on like weather) and the sun goes down behind the valley's end.
import { track } from '/song/lib/cam.js';
import { anchor } from '/timing.js';
import { valleyScene, stone } from '/song/lib/x-valley.js';
import { skyMix, grade, FINISH, smooth } from '/song/lib/look.js';
import { inscribe, wrap, wordOf } from '/song/lib/type.js';
export const kind = 'shader';

export default (P) => {
  const A = anchor('Adam begot', 'after his own form');
  const S = anchor('And he called his name Seth', 'for God had set', 'And the days went on', 'and sons and daughters');
  const s0 = stone(0), s1 = stone(1);
  // a point in front of a stone's face: d metres out, side metres to the right as you face it, eye height y
  const at = (s, d, side = 0, y = 0) => [s.face[0] + s.n[0] * d - s.n[2] * side, s.face[1] + 0.35 + y, s.face[2] + s.n[2] * d + s.n[0] * side];
  const on = (s, y = 0) => [s.face[0], s.face[1] + y, s.face[2]];
  const cam = track([
    { t: P.from, pos: at(s0, 6.2, -2.2, 0.1), look: on(s0, 0.45) },
    { t: 27.6, pos: at(s0, 3.5, -0.7), look: on(s0, 0.3) },
    { t: 31.6, pos: at(s0, 2.6, 0.25), look: on(s0, 0.02) },
    { t: 34.4, pos: [s0.x - 3.0, s0.y + 1.7, s0.z + 4.5], look: [s1.face[0] + 1.5, s1.face[1] + 0.9, s1.face[2] + 3] },
    { t: 37.4, pos: at(s1, 3.8, -0.9), look: on(s1, 0.3) },
    { t: 41.2, pos: at(s1, 2.8, 0.05), look: on(s1, 0.05) },
    { t: P.to, pos: at(s1, 2.35, 0.55), look: on(s1, -0.12) },
  ], { handheld: { amount: 0.9, seed: 3 }, fov: 42, aperture: 0.004 });
  const aL = wrap(A.lines.map((l) => ({ words: l.words })), 36);
  const sL = wrap(S.lines.map((l) => ({ words: l.words })), 36);
  const nameA = wordOf(A.lines, /^Adam/), nameS = wordOf(S.lines, /^Seth/);
  return valleyScene(P, {
    name: 's01-adam', cam, ink: 1.4,
    sky: (t) => skyMix('dusk', 'twilight', smooth((t - P.from) / (P.to - P.from)) * 0.45),
    slots: { 0: 0, 1: 1 },
    lamps: () => [1, 1, 0, 0, 0, 0, 0, 0, 0, 0],
    words(ctx, t, col, box) {
      const [lines, name] = col === 0 ? [aL, nameA] : [sL, nameS];
      inscribe(ctx, t, [{ words: [{ ...name, w: col === 0 ? 'ADAM' : 'SETH' }] }], { x: box.x + 60, y: 120, w: box.w - 120, h: 300 }, { size: 230, font: 'caps', tracking: 0.08 });
      inscribe(ctx, t, lines, { x: box.x + 70, y: 470, w: box.w - 140, h: 1500 }, { size: 78, leading: 1.32 });
    },
    update(t, u) { u.uCloudSpeed.value = 0.035 + 0.11 * smooth((t - 40.4) / 3); },
    post: () => grade({ exposure: 1.15 }),
    finish: () => FINISH,
  });
};
