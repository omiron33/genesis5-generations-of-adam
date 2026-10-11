// s03-enos: "Seth lived and begot Enos, / then men began to call on the Name. / Enos begot Cainan, /
// and Cainan begot Maleleel,"
// Twilight in the valley. A low glide up the road past three stones, ENOS, CAINAN and MALELEEL;
// each stone's lamp catches as its name is sung and its line fills with light.
import lyrics from '/timing.js';
import { track } from '/song/lib/cam.js';
import { valleyScene, stone } from '/song/lib/x-valley.js';
import { skyMix, grade, FINISH, smooth } from '/song/lib/look.js';
import { inscribe, anchorAt, wrap, wordOf } from '/song/lib/type.js';
import { spring } from '/kit/motion.js';
export const kind = 'shader';

export default (P) => {
  const A = anchorAt(lyrics, P.from, 'Seth lived', 'then men began', 'Enos begot Cainan', 'and Cainan begot');
  const L = A.lines;
  const s = [2, 3, 4].map(stone);
  const at = (st, d, side = 0, y = 0) => [st.face[0] + st.n[0] * d - st.n[2] * side, st.face[1] + 0.35 + y, st.face[2] + st.n[2] * d + st.n[0] * side];
  const on = (st, y = 0) => [st.face[0], st.face[1] - 0.3 + y, st.face[2]];
  // Enos's stone holds the first three lines, read close; a glide to Cainan's for the fourth, with
  // Maleleel's lamp catching on the stone beyond
  const cam = track([
    { t: P.from, pos: at(s[0], 4.6, -1.6, 0.25), look: on(s[0], 0.35) },
    { t: 69.6, pos: at(s[0], 3.0, -0.2, 0.1), look: on(s[0], 0.25) },
    { t: 74.6, pos: at(s[0], 2.8, 0.35, 0.05), look: on(s[0], 0.15) },
    { t: 76.4, pos: at(s[1], 3.6, -0.7, 0.2), look: on(s[1], 0.25) },
    { t: P.to, pos: at(s[1], 3.0, 0.4, 0.1), look: on(s[1], 0.15) },
  ], { handheld: { amount: 0.8, seed: 71 }, fov: 44, aperture: 0.004 });
  const names = ['ENOS', 'CAINAN', 'MALELEEL'];
  const nameWord = [wordOf([L[0]], /^Enos/), wordOf([L[2]], /^Cainan/), wordOf([L[3]], /^Maleleel/)];
  const text = [wrap([L[0], L[1], L[2]], 30), wrap([L[3]], 26), []];
  return valleyScene(P, {
    name: 's03-enos', cam,
    sky: (t) => skyMix('dusk', 'twilight', 0.45 + 0.35 * smooth((t - P.from) / (P.to - P.from))),
    slots: { 2: 0, 3: 1, 4: 2 },
    lamps: (t) => [1, 1, ...nameWord.map((w) => (t < w.start ? 0 : 0.35 + 0.65 * spring(t, w.start, { freq: 1.5, damping: 0.55 }))), 0, 0, 0, 0, 0],
    words(ctx, t, col, box) {
      inscribe(ctx, t, [{ words: [{ ...nameWord[col], w: names[col] }] }], { x: box.x + 60, y: 120, w: box.w - 120, h: 300 }, { size: 230, font: 'caps', tracking: 0.06 });
      inscribe(ctx, t, text[col], { x: box.x + 70, y: 470, w: box.w - 140, h: 1500 }, { size: 96, leading: 1.32 });
    },
    update(t, u) { u.uPray.value[0] = 2; u.uPray.value[1] = smooth((t - L[1].start + 0.2) / 1.2) * (1 - 0.5 * smooth((t - L[2].start - 1.0) / 3)); },
    post: () => grade({ exposure: 1.6 }),
    finish: () => FINISH,
  });
};
