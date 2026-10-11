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
  // Adam's stone holds everything up to "the days went on like weather", read close and square-on;
  // then a fast glide up the road under racing cloud to Seth's stone for the last line
  const cam = track([
    { t: P.from, pos: at(s0, 6.0, -2.0, 0.1), look: on(s0, 0.45) },
    { t: 26.8, pos: at(s0, 3.4, -0.6), look: on(s0, 0.35) },
    { t: 30.0, pos: at(s0, 3.0, -0.1, 0.1), look: on(s0, 0.3) },
    { t: 36.5, pos: at(s0, 2.8, 0.25, 0.05), look: on(s0, 0.2) },
    { t: 40.2, pos: at(s0, 2.9, 0.45), look: on(s0, 0.05) },
    { t: 41.6, pos: [s0.x - 3.0, s0.y + 1.75, s0.z + 6.5], look: [s1.face[0], s1.face[1] + 0.6, s1.face[2]] },
    { t: 43.0, pos: at(s1, 3.3, -0.5), look: on(s1, 0.2) },
    { t: P.to, pos: at(s1, 2.7, 0.2), look: on(s1, 0.0) },
  ], { handheld: { amount: 0.9, seed: 3 }, fov: 42, aperture: 0.004 });
  const aL = wrap([...A.lines, S.lines[0], S.lines[1], S.lines[2]].map((l) => ({ words: l.words })), 34);
  const sL = wrap([S.lines[3]].map((l) => ({ words: l.words })), 24);
  const nameA = wordOf(A.lines, /^Adam/), nameS = wordOf(S.lines, /^Seth/);
  return valleyScene(P, {
    name: 's01-adam', cam, ink: 1.4,
    sky: (t) => skyMix('dusk', 'twilight', smooth((t - P.from) / (P.to - P.from)) * 0.45),
    slots: { 0: 0, 1: 1 },
    lamps: () => [1, 1, 0, 0, 0, 0, 0, 0, 0, 0],
    words(ctx, t, col, box) {
      const [lines, name] = col === 0 ? [aL, nameA] : [sL, nameS];
      inscribe(ctx, t, [{ words: [{ ...name, w: col === 0 ? 'ADAM' : 'SETH' }] }], { x: box.x + 60, y: 120, w: box.w - 120, h: 300 }, { size: 230, font: 'caps', tracking: 0.08 });
      inscribe(ctx, t, lines, { x: box.x + 60, y: 440, w: box.w - 120, h: 1550 }, col === 0 ? { size: 74, leading: 1.36 } : { size: 110, leading: 1.3 });
    },
    update(t, u) { u.uCloudSpeed.value = 0.035 + 0.11 * smooth((t - 40.4) / 3); },
    post: () => grade({ exposure: 1.15 }),
    finish: () => FINISH,
  });
};
